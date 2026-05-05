'use strict';

/**
 * AWE-OS — Role-based permission matrix middleware
 *
 * Roles (least → most privileged):
 *   viewer → reviewer → admin → super_admin
 *
 * Usage:
 *   router.post('/tools', requirePermission('tools:create'), handler)
 */

// ── Permission matrix ──────────────────────────────────────────────────────────
const PERMISSIONS = Object.freeze({
  super_admin: [
    'tools:read', 'tools:create', 'tools:update', 'tools:delete',
    'tools:status',
    'pipeline:trigger', 'pipeline:pause', 'pipeline:resume',
    'ideas:read', 'ideas:create', 'ideas:approve', 'ideas:reject',
    'analytics:read',
    'users:read', 'users:update', 'users:delete',
    'admin:read', 'admin:configure',
    'queue:read', 'queue:manage',
    'retention:trigger',
  ],
  admin: [
    'tools:read', 'tools:create', 'tools:update',
    'tools:status',
    'pipeline:trigger', 'pipeline:pause',
    'ideas:read', 'ideas:create', 'ideas:approve', 'ideas:reject',
    'analytics:read',
    'users:read', 'users:update',
    'admin:read',
    'queue:read',
  ],
  reviewer: [
    'tools:read',
    'pipeline:trigger',
    'ideas:read', 'ideas:approve', 'ideas:reject',
    'analytics:read',
    'users:read',
    'queue:read',
  ],
  viewer: [
    'tools:read',
    'ideas:read',
    'analytics:read',
    'queue:read',
  ],
});

const ROLE_HIERARCHY = Object.freeze(['viewer', 'reviewer', 'admin', 'super_admin']);

// ── Helpers ────────────────────────────────────────────────────────────────────
function hasPermission(role, permission) {
  const perms = PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}

function hasRole(userRole, minimumRole) {
  const userLevel    = ROLE_HIERARCHY.indexOf(userRole);
  const minimumLevel = ROLE_HIERARCHY.indexOf(minimumRole);
  return userLevel >= minimumLevel;
}

// ── Middleware factories ───────────────────────────────────────────────────────
/**
 * Require an exact capability string.
 * Reads role from req.user.role (set by auth middleware).
 */
function requirePermission(permission) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    if (!hasPermission(role, permission)) {
      return res.status(403).json({
        success:    false,
        error:      'Insufficient permissions',
        required:   permission,
        your_role:  role,
      });
    }
    next();
  };
}

/**
 * Require at least the given role level.
 */
function requireRole(minimumRole) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    if (!hasRole(role, minimumRole)) {
      return res.status(403).json({
        success:       false,
        error:         `Requires ${minimumRole} role or higher`,
        your_role:     role,
        minimum_role:  minimumRole,
      });
    }
    next();
  };
}

module.exports = {
  PERMISSIONS,
  ROLE_HIERARCHY,
  hasPermission,
  hasRole,
  requirePermission,
  requireRole,
};
