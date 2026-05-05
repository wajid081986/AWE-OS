'use strict';

/**
 * AWE-OS — BullMQ Job Queue Service
 *
 * Queues  : ideaQueue, buildQueue, testQueue
 * Retries : max 3 attempts, exponential backoff (1s, 5s, 15s)
 * Dead-letter: failed jobs persisted to failed_jobs table after 3 attempts
 */

const { Queue, Worker, QueueEvents } = require('bullmq');
const supabase = require('../db/supabase');

// ── Redis connection ───────────────────────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

function makeConnection() {
  const { Redis } = require('ioredis');
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck:     false,
    lazyConnect:          true,
  });
}

// ── Shared job options ─────────────────────────────────────────────────────────
const DEFAULT_JOB_OPTS = {
  attempts:      3,
  backoff: {
    type:   'custom',
    delays: [1_000, 5_000, 15_000],  // ms per attempt
  },
  removeOnComplete: { count: 100 },
  removeOnFail:     false, // keep in BullMQ for inspection; we also persist to DB
};

// ── Queue definitions ──────────────────────────────────────────────────────────
let ideaQueue, buildQueue, testQueue;
let _connection;

function getConnection() {
  if (!_connection) _connection = makeConnection();
  return _connection;
}

function createQueues() {
  const conn = getConnection();
  ideaQueue  = new Queue('idea-generation', { connection: conn.duplicate() });
  buildQueue = new Queue('tool-building',   { connection: conn.duplicate() });
  testQueue  = new Queue('tool-testing',    { connection: conn.duplicate() });
  return { ideaQueue, buildQueue, testQueue };
}

// ── Dead-letter persistence ────────────────────────────────────────────────────
async function persistFailedJob(queueName, job, err) {
  try {
    await supabase.from('failed_jobs').insert({
      queue_name: queueName,
      job_name:   job.name,
      job_data:   job.data,
      attempts:   job.attemptsMade,
      last_error: err?.message || String(err),
      failed_at:  new Date().toISOString(),
    });
  } catch (dbErr) {
    console.error('[QUEUE] Failed to persist dead-letter job:', dbErr?.message);
  }
}

// ── Worker factory — wires the failed-job handler automatically ───────────────
function createWorker(queueName, processor, concurrency = 2) {
  const conn   = getConnection();
  const worker = new Worker(queueName, processor, {
    connection: conn.duplicate(),
    concurrency,
  });

  worker.on('failed', async (job, err) => {
    if (job.attemptsMade >= job.opts.attempts) {
      await persistFailedJob(queueName, job, err);
      console.error(
        `[QUEUE] ${queueName}/${job.name} permanently failed after ${job.attemptsMade} attempts:`,
        err?.message,
      );
    }
  });

  worker.on('error', (err) => {
    console.error(`[QUEUE] Worker error (${queueName}):`, err?.message);
  });

  return worker;
}

// ── Enqueue helpers ────────────────────────────────────────────────────────────
async function enqueueIdea(data) {
  if (!ideaQueue) throw new Error('Queues not initialised — call createQueues() first');
  return ideaQueue.add('generate-idea', data, DEFAULT_JOB_OPTS);
}

async function enqueueBuild(data) {
  if (!buildQueue) throw new Error('Queues not initialised — call createQueues() first');
  return buildQueue.add('build-tool', data, DEFAULT_JOB_OPTS);
}

async function enqueueTest(data) {
  if (!testQueue) throw new Error('Queues not initialised — call createQueues() first');
  return testQueue.add('test-tool', data, DEFAULT_JOB_OPTS);
}

// ── Queue stats helper — used by observability dashboard ─────────────────────
async function getQueueStats() {
  if (!ideaQueue || !buildQueue || !testQueue) return null;
  const [idea, build, test] = await Promise.allSettled([
    Promise.all([
      ideaQueue.getWaitingCount(),
      ideaQueue.getActiveCount(),
      ideaQueue.getFailedCount(),
      ideaQueue.getCompletedCount(),
    ]),
    Promise.all([
      buildQueue.getWaitingCount(),
      buildQueue.getActiveCount(),
      buildQueue.getFailedCount(),
      buildQueue.getCompletedCount(),
    ]),
    Promise.all([
      testQueue.getWaitingCount(),
      testQueue.getActiveCount(),
      testQueue.getFailedCount(),
      testQueue.getCompletedCount(),
    ]),
  ]);

  const fmt = (settled, name) => {
    if (settled.status !== 'fulfilled') return { name, error: settled.reason?.message };
    const [waiting, active, failed, completed] = settled.value;
    return { name, waiting, active, failed, completed };
  };

  return {
    idea:  fmt(idea,  'idea-generation'),
    build: fmt(build, 'tool-building'),
    test:  fmt(test,  'tool-testing'),
  };
}

// ── Graceful shutdown ──────────────────────────────────────────────────────────
async function closeQueues(workers = []) {
  await Promise.allSettled(workers.map(w => w.close()));
  await Promise.allSettled([
    ideaQueue?.close(),
    buildQueue?.close(),
    testQueue?.close(),
  ]);
  await _connection?.quit();
}

module.exports = {
  createQueues,
  createWorker,
  enqueueIdea,
  enqueueBuild,
  enqueueTest,
  getQueueStats,
  closeQueues,
  get ideaQueue() { return ideaQueue; },
  get buildQueue() { return buildQueue; },
  get testQueue()  { return testQueue; },
};
