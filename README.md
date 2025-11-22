# DigitalFootprints 🧠

A social media platform where users can share their thoughts, dreams, and digital memories.

## Features
- User authentication & profiles
- Create, edit, and delete posts
- Add personal dreams/goals
- Dark mode support
- Responsive design with Tailwind CSS

## Prerequisites
- Node.js (v14+)
- MySQL (v8.0+)
- npm

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/codemeteorite/DigitalFootprints.git
cd DigitalFootprints
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```
Then edit `.env` with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=firstdb
SESSION_SECRET=your_secret_key
PORT=3000
```

4. **Create the MySQL database**
```bash
mysql -u root -p < schemainvscode.sql
```

5. **Start the server**
```bash
node index.js
```
The app will run on `http://localhost:3000`

## Project Structure
```
.
├── index.js              # Main server file
├── package.json          # Dependencies
├── schemainvscode.sql    # Database schema
├── public/               # Static files (CSS)
├── views/                # EJS templates
│   ├── profile.ejs
│   ├── feed.ejs
│   ├── login.ejs
│   ├── edit.ejs
│   └── delete.ejs
└── README.md
```

## Database Setup
The database schema includes:
- `dfoots` table: User profiles with username, email, password, dream
- `posts` table: User posts with content and timestamps

## API Routes

### Authentication
- `GET /login` - Login page
- `POST /login` - Submit login
- `GET /logout` - Logout

### Posts
- `GET /feed` - View all posts (requires login)
- `GET /profile` - View user profile (requires login)
- `POST /add-post` - Create new post (requires login)
- `DELETE /delete-post/:id` - Delete post (requires login & ownership)
- `GET /posts/edit/:id` - Edit post page

### Users
- `GET /users` - List all users
- `GET /users/:id/stalkerview` - View user profile
- `GET /users/:id/edit` - Edit user page
- `PATCH /users/:id` - Update user (requires login)
- `GET /users/:id/tryna_delete` - Delete user confirmation
- `DELETE /users/:id` - Delete user account

### Dreams
- `POST /add-dream` - Add/update user dream

## Security Notes

⚠️ **Important**: This project currently uses plaintext passwords. For production:
- Hash passwords with `bcrypt`
- Use environment variables for secrets
- Add CSRF protection with tokens
- Implement rate limiting
- Use HTTPS

## Technologies
- **Backend**: Express.js, Node.js
- **Database**: MySQL 2 (mysql2)
- **Frontend**: EJS templates, Tailwind CSS
- **Session Management**: express-session
- **Utilities**: @faker-js/faker, method-override

## License
ISC

## Author
codemeteorite
