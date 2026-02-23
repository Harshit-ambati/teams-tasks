# Backend API

Zero-level backend structure implemented with Express and MongoDB.

## Setup

1. Install dependencies: `npm install`
2. Configure `.env` values
3. Start server: `npm run dev`

## Structure

- `server.js`
- `config/db.js`
- `models/` (`User.js`, `Project.js`, `Team.js`, `Task.js`)
- `routes/` (`authRoutes.js`, `projectRoutes.js`, `teamRoutes.js`, `taskRoutes.js`)
- `controllers/` (`authController.js`, `projectController.js`, `teamController.js`, `taskController.js`)
- `middleware/authMiddleware.js`

## Base Routes

- `GET /`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/projects`
- `GET/POST/PUT/DELETE /api/teams`
- `GET/POST/PUT/DELETE /api/tasks`
