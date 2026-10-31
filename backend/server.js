const path = require('path');
// Load .env from project root or backend folder
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { Server } = require('socket.io');

const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/error.middleware');

// Routes (referenced into ./src/routes)
const projectRoutes = require('./src/routes/project.routes');
const runRoutes = require('./src/routes/run.routes');
const eventRoutes = require('./src/routes/event.routes');
const analysisRoutes = require('./src/routes/analysis.routes');

const app = express();
const server = http.createServer(app);

// Socket.io for Real-time event & run streaming
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// API Routes conforming to Section 6 of README
app.use('/api/projects', projectRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', analysisRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DevTrace AI Backend',
  });
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect Database and Start Server
connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[DevTrace Server] Listening on http://localhost:${PORT}`);
  });
});

module.exports = { app, server };
