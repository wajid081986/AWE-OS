import { useAuth } from '../../modules/auth/context/AuthContext'

export function usePermissions() {
  const { user, role, permissions } = useAuth()

  const hasPermission = (permission) => {
    if (role === 'admin') return true
    return permissions.includes(permission)
  }

  const hasSubscription = (plan) => {
    if (!user?.subscription) return false
    return user.subscription.plan === plan || user.subscription.plan === 'enterprise'
  }

  const canAccessTool = (toolSlug) => {
    if (role === 'admin') return true
    if (hasPermission('tools:all')) return true
    return permissions.includes(`tool:${toolSlug}`)
  }

  return { hasPermission, hasSubscription, canAccessTool, role, permissions }
}
