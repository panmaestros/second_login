
const Sequelize = require('sequelize');
const env = "dev";
const config = require('./config.json')[env];
const bcrypt = require('bcrypt-nodejs');//used to encrypt your passwords
const db = {};

var validator = require('validator');

//configuration settings for setting up the sequelize with mysql
const sequelize = new Sequelize(config.database, config.user, config.password, {
  host: config.host,
  dialect: config.dialect,   //choose anyone between them
  port: config.port,
  // To create a pool of connections
  pool: config.pool,
  logging: false,//console.log,
  operatorsAliases: false

});


const User = sequelize.define('user', {
  //define the columns for a user table
  userNM1: {
    type: Sequelize.STRING, // username of user, must be unique
    unique:true,
    allowNull:false,
  },
  password: {
    type:Sequelize.STRING, // hash password of user's password
    allowNull:false,

  },
  salt:{
    type: Sequelize.STRING, // the salt for encrypting password
    allowNull: true,
  },
  failedLoginAttempts:{
    type:Sequelize.INTEGER, // field to store the amount of failed attempts made
    allowNull:false,
    defaultValue:0,
  },
  country:{
    type:Sequelize.STRING, // a filed that stores the user's country, used for detemerming login rules
    allowNull: false,
    defaultValue:"countryOne",
  }

},
{
  // getters and setters
  //this satifies the requires of full layer separation of application field name and database field name
  //database name would be userNM1 while the application would use username.
    getterMethods: {
      username: function(){return this.getDataValue("userNM1");},

    },
    setterMethods: {
      username: function(v){this.setDataValue("userNM1", v);},

    },
  hooks:{
    //hooks allow function before creating a user in the database
    beforeCreate:function (user){
      const salt = bcrypt.genSaltSync(10);
      user.password = bcrypt.hashSync(user.password, salt);  // use the generateHash function in our user model
      user.salt = salt;
    }
  },


});

User.prototype.validPassword= function(password) {
  //validate if the password entered is correct
  const hashpassword = bcrypt.hashSync(password,this.salt);
  return hashpassword ==this.password;
};



// Instance Method
User.prototype.validLoginRules = function (rules) {

  const error = {};
  for (i = 0; i < rules.length; i++) {
    //loop through rules list and validate if the user object parameters meet the rules
    const rulesData = rules[i].dataValues;//get individual rule data
    console.log("rulesData: "+JSON.stringify(rulesData));
    if(rulesData.validateStatus)///check if it is a rule that validates the user data, rules such as sessionLength are not validation rules
    {

      const data = ''+this[rulesData.validateColumn];//get the value of the user column being validated
      console.log("rules data: "+data);
      const stringoptions = rulesData[this.country];//get the rule options for the particular user country, different countries can have different configurations
      const options = JSON.parse(stringoptions);
      console.log("rule options: "+JSON.stringify(options));
      if(options!=null)
      {
        switch (rulesData.name) {
          //This section achieves the objective: 1) 3 failed consecutive login attempts using the same username results in a locked user account
          //if the failedLoginAttempts field is greater than 2 then return an error to user saying the account is locked
          //the options parameters is where you set the max limit to 2
          case "lockLimit":
            const result = validator.isInt(data, options);
            if(!result){
              error.status = result;
              error.message = rulesData.errorMessage;//display error message to user
            }
            break;
            //future configuration rules can be added below and also added to the database

        }
      }
    }
    if(error.message)
    {
      return error;
    }

  }
  return error;
}

const Ipslocked = sequelize.define('ipslocked', {
  //define the columns for ipslockd table
    ipaddress: { // ipaddress of user who has crossed the request limit
      type: Sequelize.STRING,
      unique:true,
      primaryKey: true,
      allowNull:false
    },
    lastLockedTime: {
      type:Sequelize.DATE, // a timestamp of the last time the ipaddress was locked
      allowNull:true,
    },

  },
  {
    timestamps: false, // dont auto generate timestamp and dont pluralize table name
    freezeTableName: true,
  }
);

const Country = sequelize.define('country', {
  //define the columns for the country table
  name: {
      primaryKey: true,
      type: Sequelize.STRING, //unique name for a country, countryOne, countryTwo
  },
  fullname: {
      type: Sequelize.STRING, // real name of hte country showed to user
      allowNull: false,
  },
});

const Rule = sequelize.define('rule', {
  //a rule is any configuration setting that is required in order for user to have access to login into account
  //a table that stores the configuration settings to validate the user's info based on their country. This table can be used to store rules for any table and any process but for this exercise only the user table and login process would rules be implemented
  id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
  },
  name:{
    type:Sequelize.STRING,// just the name of the rule, must be unique
    unique:true,
    allowNull:false,

  },
  validateStatus:{
    type: Sequelize.BOOLEAN,// determines if the rule is a validation rule like lockLimit
    allowNull: false,
    defaultValue: false
  },
  validateProcess:{
    type: Sequelize.STRING,// determines if the rule is a validation rule like lockLimit
    allowNull: true,

  },
  validateColumn:{
    type:Sequelize.STRING, // stores the user column that is being validated
    allowNull: true
  },
  errorMessage: {
    type: Sequelize.STRING, // stores the error message to show to user
    allowNull: false,
  },
  countryOne:{
    type:Sequelize.STRING, //field for all countryOne option parameters
    allowNull:true,
  },
  countryTwo:{
    type:Sequelize.STRING, //field for all countryTwo option parameters
    allowNull:true,
  }
});

//sync creates the tables and fields in teh database.
//after creating the tables, we populate some of the tables with dummy data.
sequelize.sync().then(() => {
  console.log(' tables has been successfully created, if one doesn\'t exist');
  var countries = [
    {
      name:'countryOne',
      fullname:'Trinidad & Tobago',
    },
    {
      name:'countryTwo',
      fullname:'Grenada',
    }
  ];
  return Country.bulkCreate(countries,{ validate: true })//populate country table with dummy data

})
.then(()=>{
  var newuser = User.build({
    username: 'mark',
    password:'test',
    country:'countryOne'
  });
  return newuser.save();//populate user table with dummy data
})
.then(()=>{
  var rules = [
      {
        name: 'lockLimit',
        validateStatus:true,
        validateProcess:'login',
        validateColumn: 'failedLoginAttempts',
        errorMessage: 'Your account is locked.',
        countryOne: '{"min":0,"max":2}',
        countryTwo: '{"min:0,"max":5}',
      },
      {
        name: 'sessionLength',
        validateStatus: false,
        validateProcess: null,
        validateColumn: null,
        errorMessage: 'No session length specified. Use default session',
        countryOne: '50000',
        countryTwo: '30000',
      },
  ];
  return Rule.bulkCreate(rules,{ validate: true }) // populate rules table with dummy data

})
.catch(error => console.log('Error creating table occured or table aready exists'));//,error


// export functions to be used externally
  db.sequelize = sequelize;
  db.Sequelize = Sequelize;
  db.User = User;
  db.Ipslocked = Ipslocked;
  db.Country = Country;
  db.Rule = Rule;

module.exports = db;
