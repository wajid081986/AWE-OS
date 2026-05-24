'use strict';

class CrawlQueue {
  constructor(maxPages = 100) {
    this._maxPages = maxPages;
    this._queue    = [];        // [{ url, depth }, ...]
    this._visited  = new Set();
    this._queued   = new Set();
  }

  enqueue(url, depth = 0) {
    if (this._visited.has(url)) return false;
    if (this._queued.has(url))  return false;
    if (this.isFull)            return false;
    this._queue.push({ url, depth });
    this._queued.add(url);
    return true;
  }

  dequeue() {
    const item = this._queue.shift();
    return item || null;
  }

  markVisited(url) {
    this._visited.add(url);
    this._queued.delete(url);
  }

  get size()         { return this._queue.length; }
  get visitedCount() { return this._visited.size; }
  get isEmpty()      { return this._queue.length === 0; }
  get isFull()       { return this._visited.size >= this._maxPages; }

  getVisited() { return [...this._visited]; }
  getQueued()  { return [...this._queued]; }

  toJSON() {
    return { queued: this._queue.length, visited: this._visited.size, maxPages: this._maxPages };
  }
}

module.exports = { CrawlQueue };
