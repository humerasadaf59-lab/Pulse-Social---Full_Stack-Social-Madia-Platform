# 🚀 Pulse Social — Full-Stack Social Media Platform

> A production-style mini social network built for **Task 2: Social Media Platform**, featuring authentication, profiles, posts, comments, likes, follows, user discovery, and a persistent MongoDB backend.

![Frontend](https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JavaScript-orange)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express.js-green)
![Database](https://img.shields.io/badge/Database-MongoDB%20%7C%20Mongoose-47A248)
![Authentication](https://img.shields.io/badge/Auth-JWT%20%2B%20bcrypt-blue)
![Status](https://img.shields.io/badge/Status-Completed-success)

---

## 📌 Overview

**Pulse Social** is a full-stack social media platform designed to demonstrate real-world web application development rather than a simple static assignment.

The platform allows users to:

- Create and manage profiles
- Publish posts
- Comment on posts
- Like and unlike posts
- Follow and unfollow users
- Discover and search users
- View profile activity
- Manage their own content

The application uses a RESTful Express.js backend with MongoDB persistence and a responsive HTML/CSS/JavaScript frontend.

---

# ✨ Features

## 🔐 Authentication

- User registration
- User login
- JWT authentication
- Password hashing using bcrypt
- Protected API endpoints
- Persistent authentication session

## 👤 User Profiles

- Public user profiles
- Username and display name
- Bio
- Location
- Website
- Avatar
- Followers count
- Following count
- Recent posts
- Profile editing

## 📝 Posts

- Create posts
- 1,000-character content limit
- Optional image URL
- Latest-post feed
- Delete your own posts

## 💬 Comments

- Add comments
- Display comment authors
- Comment timestamps
- Persistent database storage

## ❤️ Likes

- Like posts
- Unlike posts
- Live like counter
- Visual liked state

## 👥 Follow System

- Follow users
- Unfollow users
- Follower counts
- Following counts
- User discovery

## 🔎 Explore

- Search users
- Browse community members
- Follow users directly from Explore

## 📊 Dashboard

- Total members
- Total posts
- Total comments
- Feed refresh

## 📱 Responsive Design

Designed for:

- Desktop
- Laptop
- Tablet
- Mobile

---

# 🛠️ Tech Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API
- Responsive CSS

### Backend

- Node.js
- Express.js
- REST API
- JWT
- bcryptjs
- dotenv

### Database

- MongoDB
- Mongoose

---

# 🏗️ Application Architecture

```text
                    ┌───────────────────┐
                    │      Browser      │
                    │                   │
                    │ HTML              │
                    │ CSS               │
                    │ JavaScript        │
                    └─────────┬─────────┘
                              │
                              │ HTTP / REST API
                              ▼
                    ┌───────────────────┐
                    │    Express.js     │
                    │                   │
                    │ Authentication    │
                    │ Users             │
                    │ Posts             │
                    │ Comments          │
                    │ Likes             │
                    │ Follows           │
                    └─────────┬─────────┘
                              │
                              │ Mongoose
                              ▼
                    ┌───────────────────┐
                    │      MongoDB      │
                    │                   │
                    │ Users             │
                    │ Posts             │
                    │ Comments          │
                    │ Relationships     │
                    └───────────────────┘
