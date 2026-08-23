const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');
const seedData = require('./seed');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', commentRoutes);

// Healthcheck / Status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1
  });
});

// Database Connection with Fallback
async function connectDatabase() {
  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/socialmedia_db';

  try {
    console.log(`🔌 Attempting to connect to MongoDB at: ${primaryUri}`);
    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log('⚡ Connected to local MongoDB instance!');
  } catch (err) {
    console.log('⚠️ Local MongoDB connection failed or timed out. Initializing MongoMemoryServer fallback...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const memoryUri = mongoServer.getUri();
      console.log(`⚡ MongoMemoryServer started at: ${memoryUri}`);
      await mongoose.connect(memoryUri);
      console.log('✅ Connected to MongoDB Memory Database!');
    } catch (memErr) {
      console.error('❌ Failed to launch MongoMemoryServer:', memErr);
      process.exit(1);
    }
  }

  // Seed sample data if database has no users
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🚀 Database is empty. Seeding initial demo data...');
      await seedData();
    }
  } catch (seedErr) {
    console.error('⚠️ Error checking user count or seeding:', seedErr);
  }
}

// Start Server
connectDatabase().then(() => {
  const startServer = (port) => {
    const server = app.listen(port, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Social Media Platform Server running at:`);
      console.log(`👉 http://localhost:${port}`);
      console.log(`=======================================================`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${port} is occupied, trying port ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('Server start error:', err);
      }
    });
  };

  startServer(PORT);
});

