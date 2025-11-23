// server.js — Render-ready, final
require('dotenv').config();
const { faker } = require('@faker-js/faker');
const mysql = require('mysql2/promise');
const express = require('express');
const session = require('express-session');
const path = require('path');
const methodOverride = require('method-override');

const app = express();

/* ------------------------
   Config & Middlewares
   ------------------------ */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'supersecretboss',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // change if using HTTPS cookie settings in prod
  })
);

/* ------------------------
   Uploaded file path (tool will convert to URL)
   ------------------------ */
const UPLOADED_FILE_PATH = '/mnt/data/ad095fc9-1c96-4c72-ab55-a684a9d56146.png';

/* ------------------------
   Helpers
   ------------------------ */
const generateNewID = () => faker.string.uuid();

function isLoggedIn(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

async function dbQuery(sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (err) {
    throw err;
  }
}

/* ------------------------
   MySQL pool (uses env vars)
   ------------------------ */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'switchback.proxy.rlwy.net',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'railway',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 13252,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// verify connection at startup
(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('Connected to MySQL (pool) ✅');
  } catch (err) {
    console.error('MySQL connection error:', err);
    process.exit(1);
  }
})();

/* ------------------------
   Routes
   ------------------------ */

// Home
app.get('/', (req, res) => res.redirect('/feed'));

// Login page
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/feed');
  res.render('login');
});

// LOGIN submit
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const q = 'SELECT * FROM dfoots WHERE email = ? LIMIT 1';
    const rows = await dbQuery(q, [email]);

    if (!rows.length) return res.render('wrongcredentials');

    const user = rows[0];
    if (user.password !== password) return res.render('wrongcredentials');

    req.session.user = user;
    return res.redirect('/feed');
  } catch (err) {
    console.error(err);
    return res.render('wrongcredentials');
  }
});

// LOGOUT
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

/* ------------------------
   FEED
   ------------------------ */
app.get('/feed', isLoggedIn, async (req, res) => {
  const q = `
    SELECT posts.*, 
           dfoots.username, 
           dfoots.email,
           dfoots.profile_photo_url,
           posts.created_at
    FROM posts
    JOIN dfoots ON posts.user_id = dfoots.id
    ORDER BY posts.created_at DESC
  `;
  try {
    const posts = await dbQuery(q);
    res.render('feed', { posts });
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

/* ------------------------
   Stalkerview (user profile page)
   ------------------------ */
app.get('/users/:id/stalkerview', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const q = `
    SELECT dfoots.id,
           dfoots.username,
           dfoots.email,
           dfoots.dream,
           dfoots.profile_photo_url,
           dfoots.created_at,
           posts.id AS post_id,
           posts.content AS post,
           posts.created_at AS post_time
    FROM dfoots
    LEFT JOIN posts ON posts.user_id = dfoots.id
    WHERE dfoots.id = ?
    ORDER BY posts.created_at DESC
  `;
  try {
    const result = await dbQuery(q, [id]);
    res.render('stalkerview', { result });
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

/* ------------------------
   USERS list
   ------------------------ */
app.get('/users', isLoggedIn, async (req, res) => {
  try {
    const users = await dbQuery('SELECT * FROM dfoots ORDER BY username DESC');
    res.render('users', { users });
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

/* ------------------------
   NEW USER (signup) with duplicate checks
   ------------------------ */
app.get('/newuser', (req, res) => {
  const allotedId = generateNewID();
  res.render('newuser', { allotedId });
});

app.post('/newuser/:id', async (req, res) => {
  const { id } = req.params;
  const { userName, userEmail, userPassword } = req.body;

  try {
    const checkQ = `SELECT id, email, username FROM dfoots WHERE email = ? OR username = ? LIMIT 1`;
    const found = await dbQuery(checkQ, [userEmail, userName]);

    if (found.length > 0) {
      return res.status(400).send('Email or username already exists');
    }

    const insertQ = `INSERT INTO dfoots (id, username, email, password) VALUES (?,?,?,?)`;
    await dbQuery(insertQ, [id, userName, userEmail, userPassword]);
    return res.redirect('/login');
  } catch (err) {
    console.error(err);
    return res.status(500).send('DB error');
  }
});

/* ------------------------
   EDIT / DELETE user
   ------------------------ */
app.get('/users/:id/edit', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await dbQuery('SELECT * FROM dfoots WHERE id = ?', [id]);
    res.render('edit', { user: result[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

app.patch('/users/:id', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { userPassword, userName } = req.body;

  try {
    const rows = await dbQuery('SELECT * FROM dfoots WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).send('User not found');

    if (rows[0].password !== userPassword) return res.status(400).send('WRONG PASSWORD');

    const checkQ = 'SELECT id FROM dfoots WHERE username = ? AND id <> ? LIMIT 1';
    const conflict = await dbQuery(checkQ, [userName, id]);
    if (conflict.length > 0) return res.status(400).send('Username already taken');

    await dbQuery('UPDATE dfoots SET username = ? WHERE id = ?', [userName, id]);
    return res.redirect('/feed');
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

app.get('/users/:id/tryna_delete', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await dbQuery('SELECT * FROM dfoots WHERE id = ?', [id]);
    res.render('delete', { user: result[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

app.delete('/users/:id', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { userEmail, userPassword } = req.body;

  try {
    const result = await dbQuery('SELECT * FROM dfoots WHERE id = ?', [id]);
    if (!result.length) return res.status(404).send('User not found');

    if (result[0].email !== userEmail || result[0].password !== userPassword) {
      return res.status(400).send('WRONG CREDENTIALS');
    }

    await dbQuery('DELETE FROM dfoots WHERE id = ?', [id]);
    req.session.destroy(() => res.redirect('/login'));
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

/* ------------------------
   PROFILE & POSTS
   ------------------------ */
app.get('/profile', isLoggedIn, async (req, res) => {
  const user = req.session.user;
  const q = `
    SELECT posts.id AS post_id, posts.content AS post, posts.created_at AS post_time
    FROM posts
    WHERE posts.user_id = ?
    ORDER BY posts.created_at DESC
  `;
  try {
    const posts = await dbQuery(q, [user.id]);
    res.render('profile', { user, posts });
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

app.post('/add-dream', isLoggedIn, async (req, res) => {
  const userId = req.session.user.id;
  const { dream } = req.body;
  try {
    await dbQuery('UPDATE dfoots SET dream = ? WHERE id = ?', [dream, userId]);
    req.session.user.dream = dream;
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

/* ------------------------
   POSTS create/delete/edit
   ------------------------ */
app.post('/add-post', isLoggedIn, async (req, res) => {
  const { content } = req.body;
  const userId = req.session.user.id;
  const q = 'INSERT INTO posts (id, user_id, content) VALUES (?, ?, ?)';
  try {
    await dbQuery(q, [generateNewID(), userId, content]);
    res.redirect('/feed');
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

app.delete('/delete-post/:id', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;

  try {
    const rows = await dbQuery('SELECT user_id FROM posts WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).send('Post not found');
    if (rows[0].user_id !== userId) return res.status(403).send('You can only delete your own posts');

    await dbQuery('DELETE FROM posts WHERE id = ?', [id]);
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

app.get('/posts/edit/:id', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await dbQuery('SELECT * FROM posts WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).send('Post not found');
    res.render('editpost', { ogpost: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

app.patch('/posts/edit/:id', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { updatedContent } = req.body;
  try {
    await dbQuery('UPDATE posts SET content = ? WHERE id = ?', [updatedContent, id]);
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

/* ------------------------
   Add photo URL (profile)
   ------------------------ */
app.post('/add-photo-url', isLoggedIn, async (req, res) => {
  const userId = req.session.user.id;
  const { photo_url } = req.body;
  try {
    await dbQuery('UPDATE dfoots SET profile_photo_url = ? WHERE id = ?', [photo_url, userId]);
    req.session.user.profile_photo_url = photo_url;
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

/* ------------------------
   Edit Profile page + update (with uniqueness check)
   ------------------------ */
app.get('/edit-profile', isLoggedIn, (req, res) => {
  res.render('editprofile', { user: req.session.user });
});

app.post('/edit-profile', isLoggedIn, async (req, res) => {
  const userId = req.session.user.id;
  const { username, photo_url } = req.body;

  try {
    const checkQ = 'SELECT id FROM dfoots WHERE username = ? AND id <> ? LIMIT 1';
    const conflict = await dbQuery(checkQ, [username, userId]);
    if (conflict.length > 0) {
      return res.status(400).send('Username already taken!');
    }

    await dbQuery('UPDATE dfoots SET username = ?, profile_photo_url = ? WHERE id = ?', [
      username,
      photo_url,
      userId
    ]);

    req.session.user.username = username;
    req.session.user.profile_photo_url = photo_url;

    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

/* ------------------------
   Start server
   ------------------------ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Waiting for you @ http://localhost:${PORT}`);
});


