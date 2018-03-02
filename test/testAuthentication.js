let authentication = null;
const assert = require('chai').assert;// chai library to evaluate

describe('App', function(){ //mocha
  before(function(done) { // before functions runs before the other test functions
        this.timeout(6000);
        authentication = require('../authenticationlibrary'); // initialize the authentication library

        setTimeout(done, 3000);

  });
  it('App should register new user', function(done){ //run the register user test function

    let req = {};
    req.body={username:"wook9",password:"ten",confirm:"ten",country:"countryTwo"}
    //these are dummy inputs for user, remember to change username each time u run this test as the username must be unique to succeed
    let res={};
    let next={};
    const returnRoutes = {
        successRedirect: '/profile', // redirect to the secure profile section
        failureRedirect: '/register', // redirect back to the signup page if there is an error
        failureFlash: false, // allow flash messages
        failureKey:'regsiterMessage',// id of failure message
    };
    const testmode = true; // if test mode is true the return result is either null or error message

    //authentication.register is a promise based function  that from the authenticationlibrary
    authentication.register(req, res, next, returnRoutes,testmode).then((result) => {
      assert.isNull(result, 'there was an error registering');//evaluate the function from the result, if null then the function was successful
      done()
    }).catch((err) =>{
      assert.isNull(err, 'there was an error registering'); //evaluate the function from the result, if null then the function was successful
      done(err)
    });


  })

  it('App should login user', function(done){

    let req = {};
    req.body={username:"mark",password:"test",ip:"190.213.132.99"}
    //dummy inputs these inputs will always succeed once the user's credential are correct
    let res={};
    let next={};
    const returnRoutes = {
        successRedirect: '/profile', // redirect to the secure profile section
        failureRedirect: '/login', // redirect back to the login page if there is an error
        failureFlash: false, // allow flash messages
        failureKey:'loginMessage',// id of failure message
    };
    const testmode = true; // if test mode is true the return result is either null or error message
      //authentication.login is a promise based function that from the authenticationlibrary
    authentication.login(req, res, next,returnRoutes,testmode).then((result) => {
      assert.isNull(result, 'there was an error loggin in'); //evaluate the function from the result, if null then the function was successful
      done()
    }).catch((err) => {
      assert.isNull(err, 'there was an error registering'); //evaluate the function from the result, if null then the function was successful
      done(err)
    });

  })




})
