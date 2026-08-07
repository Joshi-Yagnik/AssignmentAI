const { Redis } = require('ioredis');
require('dotenv').config();

const REDIS_URL = process.env.REDIS_URL;

/**
 * Shared IORedis client.
 * BullMQ requires separate connection instances for producer vs worker,
 * so this factory creates a fresh connection each time.
 *
 * retryStrategy: () => null  — disables infinite reconnect loop so the
 * server doesn't spam error logs when Redis is not running.
 */
function createRedisConnection() {
  if (!REDIS_URL) return null;
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,          // don't connect until first command
    retryStrategy: () => null,  // give up immediately instead of looping forever
  });
}

module.exports = { createRedisConnection };
