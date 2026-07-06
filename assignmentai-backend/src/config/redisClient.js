const { Redis } = require('ioredis');
require('dotenv').config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Shared IORedis client.
 * BullMQ requires separate connection instances for producer vs worker,
 * so this factory creates a fresh connection each time.
 */
function createRedisConnection() {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
  });
}

module.exports = { createRedisConnection };
