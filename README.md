# My Second Medullun Submission by Mark Springer

## Synopsis

This project is a basic authentication library built using NodeJS, Express, Sequelize and MySQL. The authentication library, found in `authenticationlibrary.js` contains three main exported functions.

1. `register` - this function allows user to register themselves an account. See flow diagram: `docs/register.pdf`.

2. `login` - this function allows you to login into your account with extra protection features. See flow diagram: `docs/login.pdf`.

3. `limiter` - this function disables your ipaddress if you have crossed the brute force prevention limit. See flow diagram: `docs/limiter.pdf`.



## Prerequisites

This project is built with Nodejs and MySQL therefore the following software are required to be installed.

1. Download and install nodejs and the npm package manager with this link: https://nodejs.org/en/download/
2. You must download MySQL Server and MySQL Workbench using the mysql installer, follow this link: https://dev.mysql.com/downloads/installer/

## Installation Instructions

To install this project you complete the instructions set below.

1. Open MySQL workbench and create a local instance and record the port, user and password when creating the instance.
2. Create a schema/database with the name `second_login`.
3. Open the npm package console window that comes installed with nodejs
4. Clone  or download the zip for this repo: git clone https://github.com/panmaestros/second_login.git
5. Go to the directory of the clone project in your npm package console window.
6. Install packages by running this command: `npm install`
7. Edit the database configuration file with the port, user and password from the mysql local instance you created above : `config.json`
8. Launch the app by using this command: `npm start`. Your database should be populated with tables and data.

## Unit Testing

Unit Testing was done using Mocha and Chai dev-dependency libraries. Tests were performed on two main functions in the authentication library, `register` and `login`. The test script is found in `test/testAuthentication.js`.
The register test achieves success only when a new username is in the input parameters of the test. If an existing username is used in the register test, the test will fail.
The login test achieves success when the correct username and password of an existing user is passed in the input of the function. Entering and incorrect username or password would result in a fail.

To run the test please follow the instructions below.

1. Install packages by running this command: `npm install`.
2. Launch the test by using this command: `npm run test`.

## Database Data Model Explained

The MySQL database for this project consists of the following two tables, `users`, `ipslocked`,`countries`, `rules`. There are no relationships between these two tables based on the project requirements.

* `users`- a table where all users for the app is stored. It contains three fields as follows:
  1. `id (INT)`- this is an auto-incremented index field that increments when a new row is added to the table. The entries into this field must be unique, not null, and this field is the primary key of the table.
  2. `userNM1 (VARCHAR(255))`- this is where the username, the user enters is stored as a string. The username must also be unique and not null.
  3. `password (VARCHAR(255))`- this is where the encrypted password is stored as a string. The password must be not null.
  4. `salt (VARCHAR(255))`- this is the encryption key for the particular password stored as a string. It  provides extra encryption to your password and is stored so that it can be used when checking if the password entered by user is matches the password stored.
  5. `failedLoginAttempts (INT(11))`- this is a count of the number of times the user has entered an incorrect password for the particular username. The count is stored in an INT field and is later reset to 0 when the user enters the correct password.

* `ipslocked` - a table that stores all IP addresses that have crossed the brute force prevention limit for this app. This limit is 13 failed logins within 10 minutes regardless of username. It contains two fields as follows:
  1. `ipaddress (VARCHAR(255))`- this is where the user's IP address is stored once they have crossed the brute force prevention limit. It must be unique, not null and is the primary key of the table.
  2. `lastLockedTime (DATETIME)`- this is the timestamp being record of when the user had crossed the brute force prevention limit. This field is reset to null once 20 minutes has passed and the user tries to sign in again. The entries in this field can be null.

* `countries` - a table that stores the countries that are available to the application.
  1. `name (VARCHAR(255))` - unique name for a country, eg. countryOne, countryTwo
  2. `fullname (VARCHAR(255))` - // real name of hte country showed to user

* `rules` - a table that stores the configuration settings to validate the user's info based on their country. This table can be used to store rules for any table and any process but for this exercise only the user table and login process would rules be implemented
  1.`name` - just the name of the rule, must be unique
  2.`validateStatus` - determines if the rule is a validation rule like lockLimit
  3.`validateProcess` - categories the rules into process so that similar rules are processed with the same function
  3.`validateColumn` - stores the column from users table that is being validated
  4.`errorMessage` - stores the error message to show to user
  5.`countryOne` - field for all countryOne option parameters
  6.`countryTwo` - field for all countryTwo option parameters


##  Explaining the Authenication Rules and How to Implement Future Rules

The login process is where all the authentication rules are implemented for this project. It serves to provide extra protection from unwanted attackers from accessing an existing user account. The authentication rules for a particular user varies based on the user specifying his/her country when registering. The user's country would then determine what parameters would be selected to protect the user's account. These parameters are stored in the `rules` table and when the user logs in, the parameters are chosen from the country column that matches the user's country.

The extra protection features that were implemented were as follows:

    1. Enter an incorrect password for a particular user and your account would be locked based on the parameters set in the country field of the rules table.

    2. A session length for the user depends on the user's country selected.

One example of future requirement is to use a different salt encryption based on the user's country. To implement this new authentication rule please read the manual document `docs/UserAuthenticationRules.rtf`

Note: Entering random usernames and passwords 13 times in the span of 10 minutes would result in your ipaddress being block from logging in for 20 minutes. This feature was instructed to be independent of the user so it couldn't be part of the authentication rules that were based on user's country.

## WebUI Setup

The webUI For this project there are four web pages as follows:

* Index (Home) page: `views/ejs/index.js` - This page is the home page and the default page shown to the user. It contains only a navigation to the login and register pages.
* Register page: `views/ejs/register.js` - This page is the register page where you can create a new user for the website by inputing a username and password.
* Login page: `views/ejs/login.js` - This page is the login page where you can log into your account with username and password.

* Profile page: `view/ejs/profile.js` - When a user successfully registers or logs, the user can view their username, encrypted password and id.


## Integration Testing
You can test the authentication library against the webUI to verify integration testing. Follow the instructions below.

1. Run `npm start` if not alreadt running. Visit in your browser at: http://localhost:8080
2. Register a new user on the register page and you should register successfully and be taken to your profile.
3. Refresh your page after 10 seconds and you should be logged out.
4. Go to your login page and login with your correct credentials and check the remember box and you should be logged in successfully. You would also get an extended session for 1 minute. After 1 minute you should then be logged out.
5. Enter an incorrect password for your account more than 2 times and your account should be locked. To get access back into your account go to the database and set the field `failedLoginAttempts` in the `users` table back to 0.
6. To test the brute force prevention limit follow these steps.
    * You should first stop your server `press ctrl + c`. then go to your `authenticationlibrary.js` file in your project.
    * Search for a variable called `testmode`, and set it to `true`. This will change the settings of your brute force prevention limit from `13 requests every 10 minutes and lock your account for 20 minutes` to `3 requests every 10 seconds and lock your account for 1 minute`.
    * Then save and restart the server, `npm start`. Go to your login page, `localhost:8080/login`.
    * Manually enter 3 random usernames and passwords within 10 seconds and on the third attempt your request will be blocked.
    * You can then check after 10 seconds that you still will not be able to access your account until 1 minute has passed.



## API Reference

* Database was managed using Sequelize:[https://github.com/sequelize/sequelize]
* Session management was done using Express Session and Cookie Parser API: [https://github.com/expressjs/session] & [https://github.com/expressjs/cookie-parser]
* Password encryption was done using Bcrypt API: [https://www.npmjs.com/package/bcrypt-nodejs]
* EJS was used as the templating language to built the webUI pages: [https://github.com/tj/ejs]
* Configuration policies was implemented using Validator: [https://github.com/chriso/validator.js]
* Caching of IP address in memory with expiry time was done using Node-Cache: [https://github.com/mpneuried/nodecache]
