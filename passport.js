const GoogleStrategy = require("passport-google-oauth20").Strategy;
const passport = require("passport");
const mysql = require("mysql2");

// DB connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'firstdb',
    password: '1-2-MohdYahiya'
});

// Google OAuth Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback"
        },
        function (accessToken, refreshToken, profile, done) {
            
            const email = profile.emails[0].value;
            const name = profile.displayName;
            const id = profile.id;

            // Check if user exists
            const checkQ = "SELECT * FROM dfoots WHERE email = ?";
            connection.query(checkQ, [email], (err, result) => {
                if (err) return done(err);

                // If user exists → login
                if (result.length > 0) {
                    return done(null, result[0]);
                }

                // Else → register automatically
                const insertQ =
                    "INSERT INTO dfoots (id, username, email, password) VALUES (?, ?, ?, ?)";

                connection.query(
                    insertQ,
                    [id, name, email, "GOOGLE_LOGIN"],
                    (err2, res2) => {
                        if (err2) return done(err2);

                        return done(null, {
                            id,
                            username: name,
                            email
                        });
                    }
                );
            });
        }
    )
);

// Sessions
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
