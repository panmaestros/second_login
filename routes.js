var authentication = require('./authenticationlibrary');


// app/routes.js
module.exports = (app)=>{


    // route for user signup
    app.route('/register')
      .get(isNotLoggedIn, (req, res) => {
        var options = {};
        options.message = req.flash('registerMessage');

        res.render('ejs/register', options);
      })
      .post((req,res,next)=> authentication.register(req, res, next,{
          successRedirect: '/profile', // redirect to the secure profile section
          failureRedirect: '/register', // redirect back to the signup page if there is an error
          failureFlash: true, // allow flash messages
          failureKey:'registerMessage',//id of failure of messages
      }))


    // route for user Login
    app.route('/login')
      .get(isNotLoggedIn, (req, res) => {
        var options = {};
        options.message = req.flash('loginMessage');

        res.render('ejs/login', options);
      })
      .post((req,res,next)=> authentication.limiter(req,res,next), (req,res,next)=> authentication.login(req, res, next,{
          successRedirect: '/profile', // redirect to the secure profile section
          failureRedirect: '/login', // redirect back to the signup page if there is an error
          failureFlash: true, // allow flash messages
          failureKey:'loginMessage', //id for failure messages
      }));

    // =====================================
    // LOGIN ===============================
    // =====================================


    // GET /logout
    app.get('/logout', isLoggedIn, (req, res, next) =>{
      if (req.session) {
        // delete session object
        req.session.destroy((err)=> {
          if(err) {
            return next(err);
          } else {
            res.clearCookie('user_sid');
            return res.redirect('/login');
          }
        });
      }
    });


    app.get("/profile", isLoggedIn,
        (req, res)=>{
            var options = {};
            options.user = req.session.user;
            //pass in user data to profile page
            res.render('ejs/profile', options);
        });



//default route that go home page if the other routes above dont match
    app.get("/*", (req, res)=>{
        res.render('ejs/index');
    });

    // route middleware to make sure
    function isLoggedIn(req, res, next) {

        // if user is authenticated in the session, carry on
        if (req.session && req.session.user)
            return next();
        // if they aren't redirect them to the home page
        res.redirect('/');
    }

    // route middleware to make sure
    function isNotLoggedIn(req, res, next) {

        // if user is not authenticated in the session, carry on
        if (!(req.session && req.session.user))
            return next();
        // if they are redirect them to the profile page
        res.redirect('/profile');
    }


}
