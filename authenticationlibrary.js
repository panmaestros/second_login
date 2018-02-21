var moment = require('moment'); // moment is used for processing  all javascript and mysql dates
var db = require('./mysql'); // initiate the mysql database here
const Op = db.Sequelize.Op //this is required to use operators in sequelize queries
const authentication = {}; //the wrapper object for all teh functions
const uuidv4 = require('uuid/v4');//a unique key for caching ipaddress

var globalCache = {};


const testmode = false; // if true the system would lock your ipaddress for 1 minute if you make 3 requests within 10 seconds, else if false the system would lock your ipaddress for 20 minutes if you make 13 requests in 10 minutes
const parameters = testmode ?
{
  minutesLocked: 1, // time to lock your ip address for 1 minute
  windowSed: 10, // the brute force limit is 10 seconds for 3 request
  checkWindow:6,// time period to clear old data in cache memory
  max: 2,// max amount of requests to receive before locking ipaddress

}
:
{
  minutesLocked: 20, // time to lock your ip address for 13 minutes
  windowSec: 600, // the brute force limit is 10 minutes, 600 secs for 13 request
  checkWindow: 60,// time period to clear old data in cache memory
  max: 12,// max amount of requests to receive before locking ipaddress

}

const NodeCache = require( "node-cache" ); // an immemory caching library for ipaddress

//we set the ttl of every object we set in the memory cache to 10mins
const myCache = new NodeCache({ stdTTL: parameters.windowSec, checkperiod: parameters.checkWindow });


// register function that receives parameters to register a user
function register(req, res, next, returnRoutes, testmode) {

  const data = req.body;//the input data

    //we are checking if the passwords entered by user match, if not throw error in flash to user
  if(data.confirm!=data.password)
  {
    const error = "Passwords are not matching";
    console.log();
    if(returnRoutes.failureFlash)
      req.flash(returnRoutes.failureKey, error);
    return Promise.reject(error); //redirect to failed login route is password are not match
  }
//if password are match then create new user in database using sequelize
  return db.User.create({
      username: data.username,
      password: data.password,
      country: data.country,
  })
  .then((user) => {
      if(!testmode){
        req.session.user = user.dataValues;
        res.redirect(returnRoutes.successRedirect);
      }// store the user data in a session

      return Promise.resolve(null);  // redirect ot profile page for succesful login
  })
  .catch(err => {
    const error = 'Username not available.'
      console.log(err);//throw a failure message if you cannot create a new user
      if(returnRoutes.failureFlash)
        req.flash(returnRoutes.failureKey, error)
      if(!testmode)
      {
        res.redirect(returnRoutes.failureRedirect);
      }
      return Promise.reject(error);
  });

}

// route middleware to make sure
function login(req, res, next, returnRoutes, testmode) {

  const username = req.body.username;//input data
  const password = req.body.password;

  let user = null;
  let rules = null;
  const ipaddress = req.ip; //get ipaddress
  console.log("I am here at login");
  return db.Ipslocked.findOne({ where: { ipaddress: ipaddress } })//find if the ipaddress exists in the ipslocked table
  .then((ipuser)=>{
    if(ipuser)
    {
      const ipdata = ipuser.dataValues;//get data from ipaddress query if exists
      if(ipdata.lastLockedTime)//check if the ipaddress has an active lockedTime;
      {
        const lockedTime = moment(ipdata.lastLockedTime).format("YYYY-MM-DD HH:mm:ss");//formatting the lastLockedTime stored in database
        const myCurrentTime =  moment(new Date()).format("YYYY-MM-DD HH:mm:ss");//formatting the current date time.
        console.log("LockedTIME:"+lockedTime);
        console.log("myCurrentTime:"+myCurrentTime);
        const lockMinutes = calculateMinutes(lockedTime,myCurrentTime);// get the difference in minutes of the two dates
        console.log("Locked Minutes:"+lockMinutes);
        if(lockMinutes>parameters.minutesLocked)
        {
          //if the minutes difference is greater than 20 or then set amount for minutesLocked then reset the datetime of that ipaddress.
          return db.Ipslocked.update({lastLockedTime: null}, {
            where: {ipaddress: ipaddress}
          })

        }
        else {
          //if the minutes difference is less than 20 minutes or 1 minute if in testmode then throw a flash message to the user stating the account is suspended for 20 minutes
          const minuteslabel = parameters.minutesLocked==1 ? " minute" : " minutes";
          const error = "Your ipaddress is suspended for "+parameters.minutesLocked+ minuteslabel;
          console.log(error);
          //if(returnRoutes.failureFlash)
            //req.flash('loginMessage', 'Your ipaddress is suspended for '+parameters.minutesLocked+ minuteslabel); // req.flash is the way to set flashdata using connect-flash
          return Promise.reject(error);
        }
      } else return Promise.resolve();

    }
    else return Promise.resolve();

  })
  .then(function(){
    //find the user data for the username entered
    //instance.getDataValue('text')
    return db.User.findOne({ where: { userNM1: username }, raw: false });
  })
  .then(function(myuser){
    user = myuser;
    if (!myuser) {
        //if user doesn't exist then return an error and go back to login
        const error = 'Username not available.';
        //if(returnRoutes.failureFlash)
        //  req.flash(returnRoutes.failureKey, error)
        return Promise.reject(error);
    }
    else{
      //if you have a user then get all the configuration rules for that user based on the user's country
      const mycondition = {};
      mycondition[user.get().country]= { //get all rules where the user's country is not null
        [Op.ne]: null
      };
      mycondition.validateProcess = "login"; // get all rules where rules process is login

      return db.Rule.findAll({where:mycondition});//find all the rules from query
    }

  })
  .then(function (myrules) {
      rules = myrules;
      //validLoginRules check if all your configuration rules have been met when logging in user
      //one such rule is to lock user account after 3 failed attempts
      const ruleerror = user.validLoginRules(rules);
      if (ruleerror.message) {
        //if you receive a rule error that means the one of the rules was invalid
        //diplay rules error and exit the login process
        //console.log(ruleerror.message);


        return Promise.reject(ruleerror.message);
      }
      else if (!user.validPassword(password)) {
        //now we check if the password entered was incorrect
        //if it is not correct then we increment the loginFailedAttempt field and show error
        //const error ='Username or password is incorrect.';
         //if(returnRoutes.failureFlash)
          // req.flash(returnRoutes.failureKey, error);

         const newfailedcount = user.get().failedLoginAttempts +1;//increment failed login count and update failed login count
         console.log("Failed attempts: "+ newfailedcount);

         return db.User.update({failedLoginAttempts: newfailedcount}, {
           where: {id: user.get().id}
         })
         .then(()=>{
           const error = 'Oops! Invalid User Credentials';
           return Promise.reject(error);
         })
         .catch((err)=>{
           //if you cant update the failedLoginAttempts then show error
           ///console.log(err);
           const error = 'Oops! Invalid User Credentials';
          //console.log(error);


            return Promise.reject(error);

         });


      }
      else {
        //if your login credentials are correct and have achieved all the rules then we arrive there
        //reset your failedLoginAttempts back to zero then store user data in session
          return db.User.update({failedLoginAttempts: 0}, {
            where: {id: user.get().id}
          })
          .then(()=>{
            return db.Rule.findOne({ where: { name:'sessionLength' }});
          })
          .then((rule)=>{
            if(!testmode)
            {
              req.session.user = user.get();// store user data in session

              const userSession = rule.get()[user.get().country]; //get the session length for this user from the rules table and the user's country
              console.log("User Session: "+userSession);
              if(userSession)
                 req.session.cookie.maxAge =  parseInt(userSession);
                console.log("hello, user has logged in");


            }

            return Promise.resolve(null);// go to success route

          })
          .catch((err2)=>{
            console.log(err2);
            const error = 'Oops! Error updating your failed count.'
            //console.log(error);

            return Promise.reject(error);//throw error if you cant reset failed count

          });

      }
  })
  .then(()=>{
    if(!testmode)
    {
      res.redirect(returnRoutes.successRedirect); // redirect to success route profile page
    }
    return Promise.resolve(null);
  })
  .catch((error)=>{
    //console.log(error);
    if(returnRoutes.failureFlash)
      req.flash(returnRoutes.failureKey, error);
     if(!testmode)
     {
       res.redirect(returnRoutes.failureRedirect); // redirect to fail route login page
     }
    return Promise.reject(error);//redirect to failure route

  });


}


function calculateMinutes(startDate,endDate)
{
  //this function calculates the difference in dates and return the results in minutes
   var start_date = moment(startDate, 'YYYY-MM-DD HH:mm:ss');
   var end_date = moment(endDate, 'YYYY-MM-DD HH:mm:ss');
   var duration = moment.duration(end_date.diff(start_date));
   var minutes = duration.asMinutes();
   return minutes;
}

function getCacheObject(ipaddress, keyarray){
  //this is used to get all the cache objects for a particular ipaddress.
  //A global variable called globalCache is being used to record to mapping of ipaddress and ids.
  //keyarray is an array of the keys that are tiedto that particular ipaddress
  //myCache is a caching library that stores unique keys each with a 10min or (whatever ttl time was set) expiring time
  return new Promise((resolve, reject) => {

    myCache.mget(keyarray, function( err, value ){
      if( !err ){
        if(value == undefined){
          // key not found
          globalCache[ipaddress]= {};//if there is no cache data for this ipaddress then initialize the globalcache for this ipaddress

          resolve(value);
        }else{
          //retrieve a list of objects that have not expired yet and update the internal global cache.
          globalCache[ipaddress]= value;
          resolve();
        }
      }
      else reject();
    });
  });

}

function setCacheObject(id, ipaddress){
  //this function sets the unique keys in the myCache store all with a fixed ttl.
  //it also sets the key to the internal globalCache and ties it the the ipaddress.
  return new Promise((resolve, reject) => {
    myCache.set( id, ipaddress, function( err, success ){
      if( !err && success ){
        let myaddress = globalCache[ipaddress];
        myaddress[id] = id;
        resolve();
      }
      else reject();
    });
  });

}



function limiter(req,res,next){

  //the rate limit achieves the foollowing objective:
  //a) 13 failed login attempts regardless of username in the span of 10 minutes
  //the limiter object created is placed in the app login route before your passport login authentication

  //a function called everytime the request limit is reached.
  //when the limit is reached this function stores the ip address of the user who crossed the limit along with the time the limit was reached.
  console.log("I am here at limiter");
  const myLockTime =  moment(new Date()).format("YYYY-MM-DD HH:mm:ss");// convert new javascript date to format to process using moment library
  const ipaddress = req.ip;//get the ipaddress of the user making to request.

  let ipuser = null;
  const uuid = uuidv4();//unique id to set to each key in the caching system

  let keyobj = globalCache[ipaddress];//get all the objects from the internal globalCache
  let keyarray = [];
  if(keyobj)
  {
    for (var key in keyobj)
    {
        keyarray.push(key);//push all teh keys for a particular ipaddress into an array
    }
  }
  //first we try to get the current list of active keys for the ipaddress then we set the new key to the ipaddress.
  //the caching system is required to check how many times an ipaddress is logining into an account.

  getCacheObject(ipaddress,keyarray)
    .then((array)=>{
      return setCacheObject(uuid,ipaddress);
    })
    .then(()=>{
      keyobj = globalCache[ipaddress];//get the list of keys for the ipaddress
      console.log("Ip object length: "+JSON.stringify(keyobj));
      if(Object.keys(keyobj).length>parameters.max)
      {
        //check if the length of keys for the ipaddress has crossed the max amount permitted.
        //This is where we check if the the user has entered 13 times in 10 minutes.
        //create a sql connection
          //check if the ipaddress currently exists in the table if it does update the column, lastLockedTime.
          //if the ipaddress does not exist, create a new row with the ipaddress and timestamp.
        return db.Ipslocked.findOne({ where: { ipaddress: ipaddress } })
          .then((myipuser)=>{
            //check is the ipaddress already exists in the locked table.
            if (myipuser==null) return Promise.resolve(null);

            ipuser = myipuser;
            return Promise.resolve(ipuser);

          })
          .then((result)=>{
            //checks if the ipaddress already has a lastLockedTime. If it does have a lastLockedTime that means the ipaddress is already in the 20 minutes waiting period
            //so we only want to update the ipaddress with a new timestamp when the lastLockedTime is reset back to null. This occurs when the user logs back in after 20 minutes
            console.log("We are here");
            if(result==null)
            {
              return db.Ipslocked.create({
                  ipaddress: ipaddress,
                  lastLockedTime: myLockTime
              })
            }
            else{
              return db.Ipslocked.update({lastLockedTime: myLockTime}, {
                  where: {ipaddress: ipaddress}
                })
            }

          })
          .then(()=>{
            //goto to login authentication function
            return next();
          })
          .catch(()=>{
            const error = 'Oops! Error updating lastLockedTime count.';
            console.log(error);


          });
      }
      else{
          return next();
      }

    })
    .catch((error)=>{
      console.log(error);
    });

}

//exporting functions here
authentication.limiter = limiter;
authentication.register = register;
authentication.login = login;

module.exports = authentication;
