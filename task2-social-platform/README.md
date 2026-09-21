# Pulse Social — Task 2 Full-Stack Social Media Platform

A professional mini social media application built to satisfy **Task 2: Social Media Platform**.

## Features

- User registration and login
- JWT authentication
- User profiles
- Edit profile: name, bio, location, avatar URL, website
- Create posts
- Optional image URL on posts
- Delete your own posts
- Comments
- Like / unlike posts
- Follow / unfollow users
- Explore/search people
- Profile pages with post history
- Live counters for members, posts and comments
- Responsive mobile/tablet/desktop interface
- MongoDB persistence
- Password hashing with bcrypt
- REST API with Express.js

## Stack

**Frontend:** HTML5, CSS3, Vanilla JavaScript  
**Backend:** Node.js + Express.js  
**Database:** MongoDB + Mongoose  
**Authentication:** JWT + bcryptjs

## Project structure

```text
task2-social-platform/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .env.example
├── package.json
├── server.js
└── README.md
```

## Run locally

### 1. Install Node.js

Use a current LTS version of Node.js.

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment file

Copy `.env.example` to `.env` and update the values:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/pulse_social
JWT_SECRET=replace_with_a_long_random_secret
```

You can use local MongoDB or MongoDB Atlas.

### 4. Start

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

Open:

```text
http://localhost:5000
```

## API overview

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Users
- `GET /api/users`
- `GET /api/users/:username`
- `PATCH /api/users/me`
- `POST /api/users/:id/follow`

### Posts
- `GET /api/posts`
- `POST /api/posts`
- `DELETE /api/posts/:id`
- `POST /api/posts/:id/like`

### Comments
- `POST /api/posts/:id/comments`

### Dashboard
- `GET /api/stats`

## Portfolio / GitHub description

**Pulse Social** is a full-stack social media platform built with HTML, CSS, JavaScript, Express.js and MongoDB. It implements secure authentication, user profiles, post creation, comments, likes, following, discovery and responsive UI with a REST API backend.

## Production improvements

For a production deployment, add:
- Cloud image storage (Cloudinary/S3)
- HTTP-only secure cookies instead of localStorage JWT
- Rate limiting and request validation
- CSRF/security headers
- Pagination/infinite scroll
- Notifications
- Real-time messaging with Socket.IO
- Email verification and password reset
- Automated tests
- CI/CD
- MongoDB indexes and query optimization
