//Modules
var express = require('express');
var https = require('https');
var fs = require('fs');
var io = require('socket.io')();
var mysql = require('mysql2/promise');
var session = require('express-session');
var path = require('path');
var passport = require('passport');
let Parser = require('rss-parser');
let parser = new Parser();

//The code below is used when hosting the app since Facebook require that you use SSL
//var httpsOptions = {
  //  key: fs.readFileSync('/etc/letsencrypt/live/carolinecarlsson.se/privkey.pem'), 
    //cert: fs.readFileSync('/etc/letsencrypt/live/carolinecarlsson.se/fullchain.pem')
//}

var app = express()

//static file paths
app.use(express.static(__dirname + '/templates'));
app.use(express.static(__dirname + '/style'));
app.use(express.static(__dirname + '/js'));
app.use(express.static(__dirname + '/data'));
app.use(express.static(__dirname + '/images'));

//Loading the index page
app.get('/', function(req, res){
      res.sendFile(path.join(__dirname + '/index.html'));
    });

//Express session
app.use(session({
    secret: 'wtfwtfwtf',
    resave: false,
    saveUninitialized: false
}));

//Passport session and initialization
app.use(passport.initialize());
app.use(passport.session());

//Passport strategies for the external login
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var GoogleStrategy = require('passport-google-oauth20').Strategy;

//Socket io, making queries to the mysql database and emitting them so they are available for the client side javascript
io.on('connection', async function(client){
    //Parsing the rss feed and emitting it to the client
    let feed = await parser.parseURL('https://www.news-medical.net/tag/feed/Parkinsons-Disease.aspx');
    client.emit('feedData', feed);

    //Query to get data about sessions, notes etc to display to the researchers
    let therapiesRese = await queryDatabase('SELECT * from therapy left join therapy_list on therapy.TherapyList_IDtherapylist=therapy_list.therapy_listID left join user on therapy.User_IDpatient=user.userID');
    for (var i = 0; i < therapiesRese.length; i++) {
        let testSessions = await queryDatabase('SELECT * from test left join test_session on test.testID=test_session.Test_IDtest left join note on note.Test_Session_IDtest_session=test_session.test_SessionID where Therapy_IDtherapy=  ' + therapiesRese[i].therapyID);
       
        therapiesRese[i].testSessions = testSessions;
    }
    client.emit('therapiesRese', therapiesRese);

    //Query to get data about sessions to the physicians, for the assignments purpose I am only getting data for patient 1, since there is only 2 patients in db, and researchers can see both patients data
    let therapiesPhys = await queryDatabase('SELECT * from therapy left join therapy_list on therapy.TherapyList_IDtherapylist=therapy_list.therapy_listID left join user on therapy.User_IDpatient=user.userID where Therapy.User_IDpatient=3');
    for (var i = 0; i < therapiesPhys.length; i++) {
        let testSessions = await queryDatabase('SELECT * from test left join test_session on test.testID=test_session.Test_IDtest left join note on note.Test_Session_IDtest_session=test_session.Test_IDtest  where Therapy_IDtherapy=  ' + therapiesPhys[i].therapyID + ' GROUP BY test_session.test_SessionID');
        
        therapiesPhys[i].testSessions = testSessions;
    }
    client.emit('therapiesPhys', therapiesPhys);  

    client.emit('update', {hello: 'world'});
   
    client.on('updateNote', async function (data){
       

        if(data.noteID == null) {//Insert new note for this data.sessionID.
            await queryDatabase("INSERT INTO note (Test_Session_IDtest_session, note, User_IDmed) VALUES(" + data.sessionID + ", '" + data.text + "', " + data.user_IDmed + ")");
            
        } else { //Update note for current data.noteID
            await queryDatabase('UPDATE `note` SET `note`= "' + data.text + '" WHERE noteID = ' + data.noteID);
            

        }
    });
});

//Socket listening on port 3000
io.listen(3000);

//Database stuff, creating a connection to db
var dbCon = {
    host: "localhost",
    user: "root",
    password: "",
    database: "pd_db"
};

var connection;

//Refreshing the connection on disconnect
var handleConnection = async function() {
    connection = await mysql.createConnection(dbCon);
    connection.on('error', function(err) {
        console.log('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleConnection();
        } else {
            throw err;
        }
    });
    return;
}

handleConnection();

//Function for handling queries to database
var queryDatabase = async function(query) {
    try {
        const [rows, fields] = await connection.execute(query);
        return rows;
    } catch (error) {
        console.log("query error: " + error);
        console.log(query);
        return [];

    }
}

//Serializing the user when she/he is logging in
passport.serializeUser(function (user, done) {
    done(null, user.id);
    console.log(user);
});

//Deserializing the user when logging out
passport.deserializeUser(function(id, done) {
    done(null, id);
});

//Login check if the user have logged in, if not the person will get redirected to login page (index)
function userLoggedIn(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.redirect('/');
    }
}

//Facebook strategy
passport.use(new FacebookStrategy({
    clientID: '1989272557825909',
    clientSecret: 'b6ad2a1004cd7534e5edaa68542de33f',
    callbackURL: 'http://localhost:1338/auth/facebook/callback',
    //enableProof: true,
    profileFields: ['id', 'email']
},
    function(accessToken, refreshToken, profile, done) {
       //Adding the user to the database and assigning them the role "1" which is the patient role
       //IGNORE will not add the user to the database if an unique row already exist in db
       console.log(profile);
       queryDatabase("INSERT IGNORE INTO user (email, Role_IDrole, Organization) VALUES ('" + profile.emails[0].value + "', 1, 1)");
       return done(null, profile);
    }
));


//Authenticating facebook login
app.get('/auth/facebook', passport.authenticate('facebook', {scope: 'email'}));

app.get('/auth/facebook/callback', passport.authenticate('facebook', {  successRedirect: '/patient',
                                                                        failureRedirect: '/'}));
  

app.get('/patient', userLoggedIn, function(req, res) {
        res.sendFile(path.join(__dirname + '/templates/patient.html'));
});


//Twitter strategy
passport.use(new TwitterStrategy({
    consumerKey: 'wllzge0E3jTZ7OyNDltR37T8F',
    consumerSecret: 'LjzV00aNN5jN7r1Nd3Z6E61yZYwMPSDIdsAvGFN9Ey8VQWPVXC',
    callbackURL: 'http://localhost:1338/connect/twitter/callback',
    passReqToCallback: true
    }, function(token, tokenSecret, refreshToken, profile, done) {
        queryDatabase("INSERT IGNORE INTO user (username, Role_IDrole, Organization) VALUES ('" + profile.username + "', 3, 2)");
        return done(null, profile);
    }
));

//Authenticating twitter login
app.get('/connect/twitter', passport.authenticate('twitter'));

app.get('/connect/twitter/callback', passport.authenticate('twitter', { successRedirect: '/researcher',
                                                                        failureRedirect: '/'}));
app.get('/researcher', userLoggedIn, function(req, res){
    res.sendFile(path.join(__dirname + '/templates/researcher.html'));
});



//Google strategy
passport.use(new GoogleStrategy({
    clientID: '604880648774-4qbuienc8391qcjktj78qkpnrqjt16pr.apps.googleusercontent.com',
    clientSecret: 'KvcJyJ4FVI4k3virSrtU5pMD',
    callbackURL: 'http://localhost:1338/auth/google/callback'
},
    function (accessToken, refreshToken, profile, done) {
        queryDatabase("INSERT IGNORE INTO user (email, Role_IDrole, Organization) VALUES ('" + profile.emails[0].value + "', 2, 1)");
        return done(null, profile);
       //});
    }
));

//Authenticating Google login
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['https://www.googleapis.com/auth/plus.login',
            'email'] 
}));

app.get('/auth/google/callback', passport.authenticate('google',  { successRedirect: '/physician',
                                                                    failureRedirect: '/'}));

app.get('/physician', userLoggedIn, function(req, res){
    res.sendFile(path.join(__dirname + '/templates/physician.html'));
    
});

//Logout
app.get('/logout', function(req, res){
    req.session.destroy();
    res.redirect('/');
});
//SSL for hosting
//var server = https.createServer(httpsOptions, app);
app.listen(1338);