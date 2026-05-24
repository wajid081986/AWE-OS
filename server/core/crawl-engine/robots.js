'use strict';

class RobotsParser {
  constructor() {
    this._cache = new Map(); // domain → parsed rules
  }

  async fetch(baseUrl) {
    const origin = new URL(baseUrl).origin;
    if (this._cache.has(origin)) return this._cache.get(origin);

    try {
      const res = await fetch(`${origin}/robots.txt`, {
        signal:  AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'AWE-OS Crawler' },
      });
      const rules = res.ok ? this.parse(await res.text()) : this.defaultRules();
      this._cache.set(origin, rules);
      return rules;
    } catch {
      const rules = this.defaultRules();
      this._cache.set(origin, rules);
      return rules;
    }
  }

  parse(content) {
    const agents = {};
    let current  = null;

    for (const raw of content.split('\n')) {
      const line = raw.split('#')[0].trim();
      if (!line) continue;
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const field = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();

      if (field === 'user-agent') {
        current = value.toLowerCase();
        if (!agents[current]) agents[current] = { allow: [], disallow: [] };
      } else if (current) {
        if (field === 'allow')    agents[current].allow.push(value);
        if (field === 'disallow') agents[current].disallow.push(value);
      }
    }
    return agents;
  }

  isAllowed(url, rules) {
    const parsed  = new URL(url);
    const path    = parsed.pathname + parsed.search;
    const targets = ['awe-os', 'googlebot', '*'];

    for (const agent of targets) {
      if (!rules[agent]) continue;
      const { allow, disallow } = rules[agent];
      let best = { len: 0, allowed: true };

      for (const p of disallow) {
        if (p && path.startsWith(p) && p.length > best.len) best = { len: p.length, allowed: false };
      }
      for (const p of allow) {
        if (p && path.startsWith(p) && p.length > best.len) best = { len: p.length, allowed: true };
      }

      if (best.len > 0) return best.allowed;
    }
    return true;
  }

  defaultRules() {
    return { '*': { allow: ['/'], disallow: [] } };
  }

  clearCache() {
    this._cache.clear();
  }
}

const robotsParser = new RobotsParser();
module.exports = { RobotsParser, robotsParser };
