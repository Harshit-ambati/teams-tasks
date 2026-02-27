import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import morgan from 'morgan';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import resourceRequestRoutes from './routes/resourceRequestRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import subtaskRoutes from './routes/subtaskRoutes.js';
import collaborationRequestRoutes from './routes/collaborationRequestRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { ensureGlobalChatRoom } from './services/chatRoomService.js';
import { initializeChatSocket } from './socket/chatSocketServer.js';
import { assertMessageEncryptionReady } from './utils/messageCrypto.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (_req, res) => {
  res.status(200).json({ message: 'Backend API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/subtasks', subtaskRoutes);
app.use('/api/collaboration-requests', collaborationRequestRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/resource-requests', resourceRequestRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/users', userRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

const startServer = async () => {
  try {
    assertMessageEncryptionReady();
    await connectDB();
    await ensureGlobalChatRoom();
    initializeChatSocket(server, { corsOrigin: CLIENT_URL });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Startup failed: Port ${PORT} is already in use. Stop the running process or set a different PORT.`);
        process.exit(1);
      }

      console.error(`Startup failed: ${error.message}`);
      process.exit(1);
    });

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
