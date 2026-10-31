const mongoose = require('mongoose');

/**
 * Database Connection — README Section 7
 *
 * Connects to MongoDB (Atlas or Local) and synchronizes all schema indexes.
 * After connection, runs syncIndexes() on all registered collections.
 * Supports connection caching for serverless environments (Vercel).
 */
const connectDB = async () => {
  // If already connected, reuse existing connection (crucial for serverless environments)
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI?.trim();
  const mongoUri = uri && uri.length > 0 ? uri : 'mongodb://localhost:27017/devtrace';

  const isAtlas = mongoUri.includes('mongodb+srv://') || mongoUri.includes('.mongodb.net');
  console.log(`[Database] Connecting to MongoDB (${isAtlas ? 'Atlas Cloud' : 'Local'})...`);

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    const dbName = conn.connection.name || conn.connection.db?.databaseName || 'devtrace';
    console.log(`[Database] ✓ Connected to '${dbName}' on ${conn.connection.host}`);

    // Sync all model indexes with MongoDB to ensure they match schema definitions
    await syncAllIndexes();

    return conn;
  } catch (error) {
    console.error(`[Database Error] ✗ Connection failed: ${error.message}`);
    console.warn(`[Database Warning] Server will start, but DB operations will fail until connected.`);
    return null;
  }
};

/**
 * Synchronize indexes for all registered models.
 */
async function syncAllIndexes() {
  try {
    const modelNames = mongoose.modelNames();
    for (const name of modelNames) {
      const Model = mongoose.model(name);
      await Model.syncIndexes();
    }
    if (modelNames.length > 0) {
      console.log(`[Database] ✓ Indexes synced for: ${modelNames.join(', ')}`);
    }
  } catch (error) {
    console.warn(`[Database Warning] Index sync failed: ${error.message}`);
  }
}

module.exports = connectDB;
