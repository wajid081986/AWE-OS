'use strict';

/**
 * AWE-OS — Pipeline Validator                                Phase 4B
 *
 * Pure functions — no I/O, no side effects. Safe to call anywhere.
 *
 *   detectCycles(steps)    — DFS three-color algorithm
 *   topologicalSort(steps) — Kahn's BFS algorithm
 *   validatePipeline(def)  — full structural + graph validation
 */

/**
 * Detect cycles in a directed graph using DFS (three-color algorithm).
 * WHITE = unvisited, GRAY = in current path, BLACK = fully processed.
 *
 * @param {{ name: string, dependencies?: string[] }[]} steps
 * @returns {{ hasCycle: boolean, cycle: string[] | null }}
 */
function detectCycles(steps) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color   = Object.fromEntries(steps.map(s => [s.name, WHITE]));
  const adjList = Object.fromEntries(steps.map(s => [s.name, s.dependencies || []]));
  const nameSet = new Set(steps.map(s => s.name));
  let cyclePath = null;

  function dfs(node, path) {
    if (color[node] === GRAY) {
      cyclePath = [...path.slice(path.indexOf(node)), node];
      return true;
    }
    if (color[node] === BLACK) return false;

    color[node] = GRAY;
    path.push(node);

    for (const dep of (adjList[node] ?? [])) {
      if (!nameSet.has(dep)) continue;
      if (dfs(dep, path)) return true;
    }

    path.pop();
    color[node] = BLACK;
    return false;
  }

  for (const step of steps) {
    if (color[step.name] === WHITE && dfs(step.name, [])) {
      return { hasCycle: true, cycle: cyclePath };
    }
  }

  return { hasCycle: false, cycle: null };
}

/**
 * Topological sort using Kahn's BFS algorithm.
 * Returns steps in dependency-safe execution order (roots first).
 *
 * @param {{ name: string, dependencies?: string[] }[]} steps
 * @returns {{ order: string[] | null, error: string | null }}
 */
function topologicalSort(steps) {
  const nameSet  = new Set(steps.map(s => s.name));
  const inDegree = Object.fromEntries(steps.map(s => [s.name, 0]));
  // adjacency: dep → [steps that depend on dep]
  const adj      = Object.fromEntries(steps.map(s => [s.name, []]));

  for (const step of steps) {
    for (const dep of (step.dependencies ?? [])) {
      if (!nameSet.has(dep)) continue;
      adj[dep].push(step.name);
      inDegree[step.name]++;
    }
  }

  // Start with all nodes that have no dependencies
  const queue  = steps.filter(s => inDegree[s.name] === 0).map(s => s.name);
  const result = [];

  while (queue.length > 0) {
    const node = queue.shift();
    result.push(node);
    for (const neighbor of adj[node]) {
      if (--inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  if (result.length !== steps.length) {
    return { order: null, error: 'Topological sort failed — likely a cycle in the dependency graph' };
  }

  return { order: result, error: null };
}

/**
 * Full structural + graph validation of a pipeline definition.
 * Returns a list of all validation errors (empty = valid).
 *
 * @param {object} definition
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePipeline(definition) {
  const errors = [];

  if (!definition || typeof definition !== 'object') {
    return { valid: false, errors: ['Pipeline definition must be a non-null object'] };
  }

  if (!definition.id || typeof definition.id !== 'string') {
    errors.push('Missing or invalid pipeline id (must be a non-empty string)');
  }

  if (!definition.name || typeof definition.name !== 'string') {
    errors.push('Missing or invalid pipeline name');
  }

  if (!Array.isArray(definition.steps) || definition.steps.length === 0) {
    errors.push('steps must be a non-empty array');
    return { valid: false, errors };
  }

  const nameSet = new Set();

  for (let i = 0; i < definition.steps.length; i++) {
    const step = definition.steps[i];

    if (!step || typeof step !== 'object') {
      errors.push(`Step ${i}: must be a non-null object`);
      continue;
    }

    if (!step.name || typeof step.name !== 'string') {
      errors.push(`Step ${i}: missing or invalid name`);
      continue;
    }

    if (nameSet.has(step.name)) {
      errors.push(`Duplicate step name: "${step.name}"`);
    }
    nameSet.add(step.name);

    // Non-approval steps require an fn
    if (step.type !== 'approval' && typeof step.fn !== 'function') {
      errors.push(`Step "${step.name}": fn must be a function (type: ${step.type || 'normal'})`);
    }

    if (step.timeoutMs !== undefined) {
      if (typeof step.timeoutMs !== 'number' || step.timeoutMs < 1_000) {
        errors.push(`Step "${step.name}": timeoutMs must be a number >= 1000`);
      }
    }

    if (step.maxRetries !== undefined) {
      if (typeof step.maxRetries !== 'number' || step.maxRetries < 0) {
        errors.push(`Step "${step.name}": maxRetries must be a non-negative integer`);
      }
    }
  }

  if (errors.length > 0) return { valid: false, errors };

  // Validate all dependency references point to known step names
  for (const step of definition.steps) {
    for (const dep of (step.dependencies ?? [])) {
      if (!nameSet.has(dep)) {
        errors.push(`Step "${step.name}" depends on unknown step: "${dep}"`);
      }
    }
  }

  // Graph-level: cycle detection
  const { hasCycle, cycle } = detectCycles(definition.steps);
  if (hasCycle) {
    errors.push(`Circular dependency detected: ${cycle?.join(' → ')}`);
  }

  // Graph-level: topological sort smoke-test
  if (!hasCycle) {
    const { error: sortErr } = topologicalSort(definition.steps);
    if (sortErr) errors.push(sortErr);
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { detectCycles, topologicalSort, validatePipeline };
