import { useState, useCallback } from 'react'
import api from '../services/api.service'

/**
 * Hook for Phase 6E Self-Healing Infrastructure.
 */
export function useSelfHealing() {
  const [overview,    setOverview]    = useState(null)
  const [resilience,  setResilience]  = useState(null)
  const [failures,    setFailures]    = useState(null)
  const [recovery,    setRecovery]    = useState(null)
  const [routing,     setRouting]     = useState(null)
  const [isolation,   setIsolation]   = useState(null)
  const [repair,      setRepair]      = useState(null)
  const [health,      setHealth]      = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [healing,     setHealing]     = useState(false)
  const [error,       setError]       = useState(null)

  const loadOverview = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/self-healing/overview${forceRefresh ? '?refresh=true' : ''}`)
      setOverview(res.data?.data || res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load healing overview')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const loadResilience = useCallback(async (forceRefresh = false) => {
    try {
      const res = await api.get(`/api/self-healing/resilience${forceRefresh ? '?refresh=true' : ''}`)
      setResilience(res.data?.data || res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load resilience')
      return null
    }
  }, [])

  const loadFailures = useCallback(async (forceRefresh = false) => {
    try {
      const res = await api.get(`/api/self-healing/failures${forceRefresh ? '?refresh=true' : ''}`)
      setFailures(res.data?.data || res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load failure predictions')
      return null
    }
  }, [])

  const loadHealth = useCallback(async () => {
    try {
      const res = await api.get('/api/self-healing/health')
      setHealth(res.data?.data || res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load health')
      return null
    }
  }, [])

  const loadDashboard = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const [overviewRes, resilienceRes, failuresRes] = await Promise.all([
        api.get(`/api/self-healing/overview${forceRefresh ? '?refresh=true' : ''}`),
        api.get(`/api/self-healing/resilience${forceRefresh ? '?refresh=true' : ''}`),
        api.get('/api/self-healing/failures'),
      ])
      setOverview(overviewRes.data?.data || overviewRes.data)
      setResilience(resilienceRes.data?.data || resilienceRes.data)
      setFailures(failuresRes.data?.data || failuresRes.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDetails = useCallback(async () => {
    try {
      const [recoveryRes, routingRes, isolationRes, repairRes] = await Promise.all([
        api.get('/api/self-healing/recovery'),
        api.get('/api/self-healing/emergency-routing'),
        api.get('/api/self-healing/isolation'),
        api.get('/api/self-healing/repair'),
      ])
      setRecovery(recoveryRes.data?.data || recoveryRes.data)
      setRouting(routingRes.data?.data || routingRes.data)
      setIsolation(isolationRes.data?.data || isolationRes.data)
      setRepair(repairRes.data?.data || repairRes.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load details')
    }
  }, [])

  const triggerHeal = useCallback(async () => {
    setHealing(true)
    try {
      const res = await api.post('/api/self-healing/heal')
      await loadDashboard(true)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to trigger healing')
      return null
    } finally {
      setHealing(false)
    }
  }, [loadDashboard])

  const repairDomain = useCallback(async (domain) => {
    try {
      const res = await api.post(`/api/self-healing/repair/${domain}`)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || `Failed to repair domain: ${domain}`)
      return null
    }
  }, [])

  const recoverExecution = useCallback(async (id, action = 'reconcile') => {
    try {
      const res = await api.post(`/api/self-healing/recover/${id}`, { action })
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || `Failed to recover execution: ${id}`)
      return null
    }
  }, [])

  return {
    overview, resilience, failures, recovery, routing, isolation, repair, health,
    loading, healing, error,
    loadOverview, loadResilience, loadFailures, loadHealth,
    loadDashboard, loadDetails,
    triggerHeal, repairDomain, recoverExecution,
  }
}
