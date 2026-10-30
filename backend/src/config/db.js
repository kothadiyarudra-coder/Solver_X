const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI?.trim();
  const mongoUri = uri && uri.length > 0 ? uri : 'mongodb://localhost:27017/devtrace';

  const isAtlas = mongoUri.includes('mongodb+srv://') || mongoUri.includes('.mongodb.net');
  console.log(`[Database] Connecting to MongoDB (${isAtlas ? 'MongoDB Atlas' : 'Local MongoDB'})...`);

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Could not connect to MongoDB (${mongoUri}): ${error.message}`);
    console.warn(`[Database Warning] Server will continue running, but database operations will fail until MongoDB is connected.`);
    return null;
  }
};

module.exports = connectDB;
