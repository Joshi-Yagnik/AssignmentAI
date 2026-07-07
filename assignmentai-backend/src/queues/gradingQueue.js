const { Queue } = require('bullmq');
const { createRedisConnection } = require('../config/redisClient');

/**
 * BullMQ queue for AI grading jobs.
 * Producers (e.g. submission route) call:
 *   await gradingQueue.add('grade', { submissionId });
 *
 * If Redis is unavailable the queue will be null and callers should
 * handle that case gracefully (the submission is still saved, just not graded).
 */
let gradingQueue = null;

try {
  const redisConnection = createRedisConnection();

  // Prevent ioredis from emitting an unhandled 'error' event that would
  // crash the Express process when Redis is not running.
  redisConnection.on('error', (err) => {
    console.warn('[GradingQueue] Redis connection error (queue disabled):', err.message);
  });

  gradingQueue = new Queue('ai-grading', {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5s, 10s, 20s
      },
      removeOnComplete: { count: 500 }, // keep last 500 completed jobs
      removeOnFail: { count: 100 },
    },
  });
} catch (err) {
  console.warn('[GradingQueue] Failed to create queue (Redis unavailable?). AI grading is disabled.', err.message);
}

module.exports = { gradingQueue };
