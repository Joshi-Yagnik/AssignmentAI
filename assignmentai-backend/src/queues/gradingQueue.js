const { Queue } = require('bullmq');
const { createRedisConnection } = require('../config/redisClient');

/**
 * BullMQ queue for AI grading jobs.
 * Producers (e.g. submission route) call:
 *   await gradingQueue.add('grade', { submissionId });
 */
const gradingQueue = new Queue('ai-grading', {
  connection: createRedisConnection(),
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

module.exports = { gradingQueue };
