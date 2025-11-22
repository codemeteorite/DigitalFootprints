const { faker } = require('@faker-js/faker');
const mysql = require('mysql2');
const express = require("express");
const session = require("express-session");
const app = express();
const path = require("path");
const methodOverride = require('method-override');



// ---------------------------------------------
// ---------------------------------------------
// ---------------------------------------------
// ---------------------------------------------
// C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p  Use this to connect SQL to Terminal
// ---------------------------------------------
// ---------------------------------------------
// ---------------------------------------------
// ---------------------------------------------



// ---------------------------------------------
// EJS + Middlewares
// ---------------------------------------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    secret: "supersecretboss",
    resave: false,
    saveUninitialized: false
}));

// Generate UUID
let generateNewID = () => faker.string.uuid();

// ---------------------------------------------
// MySQL Connection
// ---------------------------------------------
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'firstdb',
    password: '1-2-MohdYahiya'
});

connection.connect(err => {
    if (err) throw err;
    console.log("Connected to MySQL");
});

// ---------------------------------------------
// Middleware to Protect Routes
// ---------------------------------------------
function isLoggedIn(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    next();
}


// ---------------------------------------------
// HOME
// ---------------------------------------------
app.get("/", (req, res) => {
    res.redirect("/feed");
});

// ---------------------------------------------
// LOGIN PAGE
// ---------------------------------------------
app.get("/login", (req, res) => {
    if (req.session.user) return res.redirect("/feed");
    res.render("login");
});

// LOGIN SUBMIT
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    const q = "SELECT * FROM dfoots WHERE email = ? LIMIT 1";

    connection.query(q, [email], (err, result) => {
        if (err) {
            console.log("DB ERROR:", err);
            return res.render("wrongcredentials"); 
        }

        // If no user exists
        if (result.length === 0) {
            return res.render("wrongcredentials");
        }

        const user = result[0];

        // Check password
        if (user.password !== password) {
            return res.render("wrongcredentials");
        }

        // SUCCESS → Store in session
        req.session.user = user;

        res.redirect("/feed");
    });
});


// LOGOUT
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

// ---------------------------------------------
// FEED PAGE (ALL POSTS)
// ---------------------------------------------
app.get("/feed", isLoggedIn, (req, res) => {
    const q = `
        SELECT posts.*, dfoots.username, dfoots.email
        FROM posts
        JOIN dfoots ON posts.user_id = dfoots.id
        ORDER BY posts.created_at DESC
    `;

    connection.query(q, (err, result) => {
        if (err) throw err;
        res.render("feed", { posts: result });
    });
});

// ---------------------------------------------
// PERSONAL USER PROFILE POSTS
// ---------------------------------------------
app.get("/users/:id/stalkerview", isLoggedIn, (req, res) => {
    const { id } = req.params;

    const q = `
        SELECT dfoots.id,
       dfoots.username,
       dfoots.email,
       dfoots.dream,
       dfoots.created_at,
       posts.id AS post_id,
       posts.content AS post,
       posts.created_at AS post_time
FROM dfoots
LEFT JOIN posts ON posts.user_id = dfoots.id
WHERE dfoots.id = ?
ORDER BY posts.created_at DESC
`;

    connection.query(q, [id], (err, result) => {
        if (err) throw err;
        res.render("stalkerview", { result });
    });
});

// ---------------------------------------------
// USERS LIST PAGE (Optional)
// ---------------------------------------------
app.get("/users", (req, res) => {
    const q = `SELECT * FROM dfoots ORDER BY username DESC`;

    connection.query(q, (err, result) => {
        if (err) throw err;
        res.render("users", { users: result });
    });
});

// ---------------------------------------------
// NEW USER PAGE
// ---------------------------------------------
app.get("/newuser", (req, res) => {
    let allotedId = generateNewID();
    res.render("newuser", { allotedId });
});

// CREATE NEW USER
app.post("/newuser/:id", (req, res) => {
    const { id } = req.params;
    const { userName, userEmail, userPassword } = req.body;

    const q = `INSERT INTO dfoots (id, username, email, password) VALUES (?,?,?,?)`;

    connection.query(q, [id, userName, userEmail, userPassword], err => {
        if (err) throw err;
        res.redirect("/login");  // FIXED
    });
});

// ---------------------------------------------
// EDIT USER PAGE
// ---------------------------------------------
app.get("/users/:id/edit", (req, res) => {
    const { id } = req.params;

    const q = `SELECT * FROM dfoots WHERE id = ?`;

    connection.query(q, [id], (err, result) => {
        if (err) throw err;
        res.render("edit", { user: result[0] });
    });
});

// UPDATE USER
app.patch("/users/:id", (req, res) => {
    const { id } = req.params;
    const { userPassword, userName } = req.body;

    const q = `SELECT * FROM dfoots WHERE id = ?`;

    connection.query(q, [id], (err, result) => {
        if (err) throw err;

        if (result[0].password !== userPassword) {
            return res.send("WRONG PASSWORD");
        }

        const updateQ = `UPDATE dfoots SET username = ? WHERE id = ?`;
        connection.query(updateQ, [userName, id], err2 => {
            if (err2) throw err2;
            res.redirect("/feed");
        });
    });
});

// ---------------------------------------------
// DELETE USER PAGE
// ---------------------------------------------
app.get("/users/:id/tryna_delete", (req, res) => {
    const { id } = req.params;

    const q = `SELECT * FROM dfoots WHERE id = ?`;

    connection.query(q, [id], (err, result) => {
        if (err) throw err;
        res.render("delete", { user: result[0] });
    });
});

// DELETE USER
app.delete("/users/:id", (req, res) => {
    const { id } = req.params;
    const { userEmail, userPassword } = req.body;

    const q = `SELECT * FROM dfoots WHERE id = ?`;

    connection.query(q, [id], (err, result) => {
        if (err) throw err;

        if (result[0].email !== userEmail || result[0].password !== userPassword) {
            return res.send("WRONG CREDENTIALS");
        }

        const delQ = `DELETE FROM dfoots WHERE id = ?`;
        connection.query(delQ, [id], err2 => {
            if (err2) throw err2;
            req.session.destroy();
            res.redirect("/login");
        });
    });
});

app.get("/profile", isLoggedIn, (req, res) => {
    const user = req.session.user;

    const q = `
        SELECT posts.id AS post_id, posts.content AS post, posts.created_at AS post_time
        FROM posts
        WHERE posts.user_id = ?
        ORDER BY posts.created_at DESC
    `;

    connection.query(q, [user.id], (err, result) => {
        if (err) throw err;
        console.log;
        res.render("profile", {
            user: user,
            posts: (result)
        });
    });
});


app.post("/add-dream", isLoggedIn, (req, res) => {
    const userId = req.session.user.id;
    const { dream } = req.body;

    const q = `UPDATE dfoots SET dream = ? WHERE id = ?`;

    connection.query(q, [dream, userId], (err) => {
        if (err) throw err;

        req.session.user.dream = dream; // instant update
        res.redirect("/profile");
    });
});


app.post("/add-post", (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    const { content } = req.body;
    const userId = req.session.user.id;

    const q = `INSERT INTO posts (id, user_id, content) VALUES (?, ?, ?)`;

    connection.query(
        q,
        [faker.string.uuid(), userId, content],
        (err) => {
            if (err) throw err;
            res.redirect("/feed");
        }
    );
});

app.delete("/delete-post/:id", isLoggedIn, (req, res) => {
    const { id } = req.params;
    const userId = req.session.user.id;

    // Check if post belongs to logged-in user
    const checkQ = `SELECT user_id FROM posts WHERE id = ?`;
    
    connection.query(checkQ, [id], (err, result) => {
        if (err) throw err;
        
        if (!result.length) {
            return res.send("Post not found");
        }
        
        if (result[0].user_id !== userId) {
            return res.send("You can only delete your own posts");
        }

        const q = "DELETE FROM posts WHERE id = ?";

        connection.query(q, [id], (err) => {
            if (err) throw err;
            res.redirect("/profile");
        });
    });
});


app.get("/posts/edit/:id", (req, res) => {
    const { id } = req.params;

    const q = `SELECT * FROM posts WHERE id = ?`;

    connection.query(q, [id], (err, result) => {
        if (err) throw err;
        res.render("editpost", { ogpost: result[0] });
    });
});

app.patch("/posts/edit/:id", (req, res) => {
    const { id } = req.params;
    const { updatedContent } = req.body;

    const q = `UPDATE posts SET content = ? WHERE id = ?`;

    connection.query(q, [updatedContent, id], (err) => {
        if (err) throw err;
        res.redirect("/profile");
    });
});


// ---------------------------------------------
// START SERVER
// ---------------------------------------------
app.listen(3000, () => {
    console.log("Waiting for you @ http://localhost:3000");
});
