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

/**
 * Detect steps that are unreachable from any root node (nodes with no dependencies).
 * A step is unreachable if it cannot be reached by forward traversal from roots.
 *
 * @param {{ name: string, dependencies?: string[] }[]} steps
 * @returns {string[]} names of unreachable steps
 */
function detectUnreachableSteps(steps) {
  if (!steps?.length) return [];

  const nameSet  = new Set(steps.map(s => s.name));
  const adj      = Object.fromEntries(steps.map(s => [s.name, []]));

  for (const step of steps) {
    for (const dep of (step.dependencies ?? [])) {
      if (nameSet.has(dep)) adj[dep].push(step.name);
    }
  }

  // BFS from all roots (steps with no dependencies)
  const roots    = steps.filter(s => !s.dependencies?.length).map(s => s.name);
  const visited  = new Set(roots);
  const queue    = [...roots];

  while (queue.length) {
    const node = queue.shift();
    for (const neighbor of (adj[node] ?? [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return steps.map(s => s.name).filter(n => !visited.has(n));
}

/**
 * Detect orphan nodes: steps with no dependencies AND no dependents.
 * These are isolated nodes that neither feed into nor receive from any other step.
 * A single-step pipeline is excluded (all steps are "orphans" by this definition but it's valid).
 *
 * @param {{ name: string, dependencies?: string[] }[]} steps
 * @returns {string[]} names of orphan steps
 */
function detectOrphanNodes(steps) {
  if (!steps || steps.length <= 1) return [];

  const hasDependencies  = new Set(
    steps.filter(s => s.dependencies?.length).map(s => s.name)
  );
  const isDependedOn = new Set(
    steps.flatMap(s => s.dependencies ?? [])
  );

  return steps
    .map(s => s.name)
    .filter(name => !hasDependencies.has(name) && !isDependedOn.has(name));
}

/**
 * Validate approval gate configuration.
 * Approval steps must have at least one dependent step; isolated approval gates are useless.
 *
 * @param {{ name: string, type?: string, dependencies?: string[], autoApproveCondition?: Function }[]} steps
 * @returns {string[]} validation errors
 */
function validateApprovalConfig(steps) {
  const errors  = [];
  const depOn   = new Set(steps.flatMap(s => s.dependencies ?? []));

  for (const step of steps) {
    if (step.type !== 'approval') continue;

    // Approval step that nothing depends on — it's a dead end
    if (!depOn.has(step.name)) {
      errors.push(
        `Approval step "${step.name}" has no dependents — it will pause the pipeline permanently`
      );
    }

    // autoApproveCondition must be a function or undefined
    if (step.autoApproveCondition !== undefined && typeof step.autoApproveCondition !== 'function') {
      errors.push(`Approval step "${step.name}": autoApproveCondition must be a function`);
    }
  }

  return errors;
}

// Re-export original validatePipeline with enhanced checks
const _originalValidatePipeline = validatePipeline;

/**
 * Full structural + graph + orphan + approval validation.
 * Replaces and extends the original validatePipeline.
 *
 * @param {object} definition
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validatePipelineEnhanced(definition) {
  const base = _originalValidatePipeline(definition);
  const warnings = [];

  if (!base.valid || !Array.isArray(definition?.steps)) {
    return { ...base, warnings };
  }

  // Unreachable step detection
  const unreachable = detectUnreachableSteps(definition.steps);
  if (unreachable.length) {
    base.errors.push(`Unreachable steps (cannot be reached from any root): ${unreachable.join(', ')}`);
    base.valid = false;
  }

  // Orphan node detection (warning, not error — single-step pipelines are fine)
  if (definition.steps.length > 1) {
    const orphans = detectOrphanNodes(definition.steps);
    if (orphans.length) {
      warnings.push(`Possible orphan steps (no connections): ${orphans.join(', ')}`);
    }
  }

  // Approval gate validation
  const approvalErrors = validateApprovalConfig(definition.steps);
  if (approvalErrors.length) {
    base.errors.push(...approvalErrors);
    base.valid = false;
  }

  return { ...base, warnings };
}

module.exports = {
  detectCycles,
  topologicalSort,
  validatePipeline,
  validatePipelineEnhanced,
  detectUnreachableSteps,
  detectOrphanNodes,
  validateApprovalConfig,
};
