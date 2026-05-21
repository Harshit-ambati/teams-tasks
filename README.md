# Teams Tasks

A MERN stack team and task management app with authentication, projects, teams, tasks, chat, notifications, audit logs, and collaboration workflows.

## Tech Stack

- Frontend: React, Vite, Axios, Socket.IO Client
- Backend: Node.js, Express, MongoDB, Mongoose, Socket.IO
- Database: MongoDB
- Deployment: Vercel for frontend, Render for backend

## Project Structure

```text
.
|-- backend/   # Express API and Socket.IO server
|-- client/    # React/Vite frontend
|-- docker-compose.yml
`-- DOCKER.md
```

## Local Setup

Install backend dependencies:

```sh
cd backend
npm install
```

Create `backend/.env` from `backend/.env.example` and update the values:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/mern_project
JWT_SECRET=replace_with_a_strong_secret
MESSAGE_ENCRYPTION_KEY=replace_with_64_hex_chars_or_32_byte_base64
```

Start the backend:

```sh
npm run dev
```

Install frontend dependencies:

```sh
cd ../client
npm install
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```sh
npm run dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Docker

Run the full stack locally with Docker:

```sh
docker compose up --build
```

Open:

```text
http://localhost:5173
```

More Docker notes are in [DOCKER.md](./DOCKER.md).

## Deployment

Recommended deployment:

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

### MongoDB Atlas

Create a MongoDB Atlas cluster and copy the connection string. It must start with:

```text
mongodb+srv://
```

Example:

```text
mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/mern_project?retryWrites=true&w=majority
```

In Atlas Network Access, allow Render to connect. For simple setup, add:

```text
0.0.0.0/0
```

### Render Backend

Create a Render Web Service from this repository.

Use these settings:

```text
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

Required Render environment variables:

```env
PORT=5000
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/mern_project?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_strong_secret
MESSAGE_ENCRYPTION_KEY=replace_with_64_hex_chars_or_32_byte_base64
CLIENT_URL=https://teams-tasks.vercel.app
CHAT_EDIT_WINDOW_MINUTES=15
CHAT_MAX_FILE_MB=15
CHAT_ALLOWED_MIME_TYPES=image/,application/pdf,text/plain,audio/,video/
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_CHAT_FOLDER=chat_uploads
AI_ASSISTANT_EMAIL=ai-assistant@local
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
REDIS_URL=
```

After deployment, test the backend root URL:

```text
https://teams-tasks.onrender.com/
```

Expected response:

```json
{ "message": "Backend API is running" }
```

### Vercel Frontend

Create a Vercel project from this repository.

Use these settings:

```text
Framework Preset: Vite
Root Directory: client
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Required Vercel environment variable:

```env
VITE_API_URL=https://teams-tasks.onrender.com/api
```

After changing Vercel environment variables, redeploy the frontend.

## CORS Checklist

If login or signup fails with a CORS error, check these values:

Render backend:

```env
CLIENT_URL=https://teams-tasks.vercel.app
```

Vercel frontend:

```env
VITE_API_URL=https://teams-tasks.onrender.com/api
```

The backend `CLIENT_URL` should not include `/api` or a trailing slash.

## Useful Commands

Backend:

```sh
npm run dev
npm start
npm run seed:defaults
```

Frontend:

```sh
npm run dev
npm run build
npm run lint
```

Docker:

```sh
docker compose up --build
docker compose down
docker compose logs -f backend
```
