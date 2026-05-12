import { useState, useCallback } from 'react'
import api from '../services/api.service'

/**
 * Hook for the Phase 6B Marketplace Expansion intelligence pipeline.
 * Manages expansion plan, health, trends, launch queue + actions.
 */
export function useMarketplace() {
  const [plan,         setPlan]         = useState(null)
  const [health,       setHealth]       = useState(null)
  const [trends,       setTrends]       = useState(null)
  const [queue,        setQueue]        = useState([])
  const [learning,     setLearning]     = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error,        setError]        = useState(null)

  const loadExpansionPlan = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/marketplace/expansion-plan')
      const data = res.data
      setPlan(data.plan       || null)
      setHealth(data.health   || null)
      setTrends(data.trends   || null)
      setLearning(data.learning || null)
      return data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load expansion plan')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const loadQueue = useCallback(async () => {
    try {
      const res = await api.get('/api/marketplace/launch-queue')
      setQueue(res.data.queue || [])
      return res.data.queue
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load queue')
      return []
    }
  }, [])

  const approveOpportunity = useCallback(async (opportunityId) => {
    setActionLoading(true)
    try {
      const res = await api.post(`/api/marketplace/approve/${opportunityId}`)
      await loadQueue()
      return { success: true, data: res.data }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Approval failed' }
    } finally {
      setActionLoading(false)
    }
  }, [loadQueue])

  const rejectOpportunity = useCallback(async (opportunityId, reason = '') => {
    setActionLoading(true)
    try {
      await api.post(`/api/marketplace/reject/${opportunityId}`, { reason })
      await loadQueue()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Rejection failed' }
    } finally {
      setActionLoading(false)
    }
  }, [loadQueue])

  const queueOpportunity = useCallback(async (opportunity) => {
    setActionLoading(true)
    try {
      const res = await api.post('/api/marketplace/queue', { opportunity })
      await loadQueue()
      return { success: true, data: res.data }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Queue failed' }
    } finally {
      setActionLoading(false)
    }
  }, [loadQueue])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/marketplace/refresh')
      const data = res.data
      setPlan(data.plan     || null)
      setHealth(data.health || null)
      setTrends(data.trends || null)
      setLearning(data.learning || null)
      await loadQueue()
      return data
    } catch (err) {
      setError(err.response?.data?.error || 'Refresh failed')
      return null
    } finally {
      setLoading(false)
    }
  }, [loadQueue])

  const reset = useCallback(() => {
    setPlan(null); setHealth(null); setTrends(null)
    setQueue([]); setLearning(null); setError(null)
  }, [])

  return {
    plan, health, trends, queue, learning,
    loading, actionLoading, error,
    loadExpansionPlan, loadQueue,
    approveOpportunity, rejectOpportunity, queueOpportunity,
    refreshAll, reset,
  }
}
