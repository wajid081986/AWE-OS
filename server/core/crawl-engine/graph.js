'use strict';

class CrawlGraph {
  constructor() {
    this._nodes = new Map(); // url → { url, depth, inboundCount }
    this._edges = [];        // [{ from, to, anchor, nofollow }, ...]
  }

  addNode(url, depth) {
    if (!this._nodes.has(url)) {
      this._nodes.set(url, { url, depth, inboundCount: 0 });
    }
  }

  addEdge(fromUrl, toUrl, anchor = '', nofollow = false) {
    this._edges.push({ from: fromUrl, to: toUrl, anchor, nofollow });
    const node = this._nodes.get(toUrl);
    if (node) node.inboundCount++;
  }

  getOrphans() {
    return [...this._nodes.values()]
      .filter(n => n.depth > 0 && n.inboundCount === 0)
      .map(n => n.url);
  }

  getHighAuthority(topN = 10) {
    return [...this._nodes.values()]
      .sort((a, b) => b.inboundCount - a.inboundCount)
      .slice(0, topN)
      .map(n => ({ url: n.url, inboundLinks: n.inboundCount }));
  }

  getDeepPages(maxDepth = 3) {
    return [...this._nodes.values()]
      .filter(n => n.depth > maxDepth)
      .map(n => ({ url: n.url, depth: n.depth }));
  }

  toJSON() {
    return {
      nodeCount: this._nodes.size,
      edgeCount: this._edges.length,
      nodes:     [...this._nodes.values()],
      edges:     this._edges.slice(0, 1000),
    };
  }
}

module.exports = { CrawlGraph };
