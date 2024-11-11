require('dotenv').config();
console.log("Loaded Environment Variables:", process.env);

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;


if (!process.env.MINIO_ENDPOINT || !process.env.MINIO_BUCKET || !process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error("Missing required environment variables. Ensure .env is properly configured.");
  process.exit(1);
}


connectDB();

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);


const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: 'http://localhost:3000' } });
app.set('io', io);

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack || err);
  res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
});


server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
