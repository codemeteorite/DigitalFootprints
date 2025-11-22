const { faker } = require('@faker-js/faker');
const mysql = require('mysql2');
const express = require("express");
const app = express();
const path = require("path");
const methodOverride = require('method-override');

// EJS + Middlewares
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, "public")));

// Generate UUID
let generateNewID = () => faker.string.uuid();

// MySQL Connection
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

// ==============================
// HOME
// ==============================
app.get("/", (req, res) => {
    res.redirect("/feed");
});

// ==============================
// FEED PAGE (ALL POSTS)
// ==============================
app.get("/feed", (req, res) => {
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

// ==============================
// USER PROFILE POSTS
// ==============================
app.get("/users/:id/stalkerview", (req, res) => {
    const { id } = req.params;

    const q = `
        SELECT posts.*, dfoots.username, dfoots.email
        FROM posts
        JOIN dfoots ON posts.user_id = dfoots.id
        WHERE user_id = ?
        ORDER BY posts.created_at DESC
    `;

    connection.query(q, [id], (err, result) => {
        if (err) throw err;
        res.render("stalkerview", { posts: result });
    });
});

// ==============================
// USERS LIST PAGE (Optional)
// ==============================
app.get("/users", (req, res) => {
    const q = `SELECT * FROM dfoots ORDER BY username DESC`;

    connection.query(q, (err, result) => {
        if (err) throw err;
        res.render("users", { users: result });
    });
});

// ==============================
// NEW USER PAGE
// ==============================
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
        res.redirect("/feed");
    });
});

// ==============================
// EDIT USER PAGE
// ==============================
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

        const user = result[0];

        if (user.password !== userPassword) {
            return res.send("WRONG PASSWORD");
        }

        const updateQ = `UPDATE dfoots SET username = ? WHERE id = ?`;
        connection.query(updateQ, [userName, id], err2 => {
            if (err2) throw err2;
            res.redirect("/feed");
        });
    });
});

// ==============================
// DELETE USER PAGE
// ==============================
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

        const user = result[0];

        if (user.email !== userEmail || user.password !== userPassword) {
            return res.send("WRONG CREDENTIALS");
        }

        const delQ = `DELETE FROM dfoots WHERE id = ?`;
        connection.query(delQ, [id], err2 => {
            if (err2) throw err2;
            res.redirect("/feed");
        });
    });
});




app.get("/users/:id/stalkerview", (req, res) => {
    const { id } = req.params;

    const q = `
        SELECT dfoots.*, posts.content AS postContent, posts.created_at AS postCreated
        FROM dfoots
        LEFT JOIN posts ON posts.user_id = dfoots.id
        WHERE dfoots.id = ?
        ORDER BY posts.created_at DESC
    `;

    connection.query(q, [id], (err, result) => {
        if (err) throw err;

        if (result.length === 0) {
            return res.send("USER NOT FOUND");
        }

        res.render("stalkerview", { data: result });
    });
});






// ==============================
// START SERVER
// ==============================
app.listen(3000, () => {
    console.log("Waiting for you @ http://localhost:3000");
});
