import { useState, useCallback } from 'react'
import api from '../services/api.service'

/**
 * Hook for Phase 6D Agent Economy Engine.
 */
export function useAgentEconomy() {
  const [overview,         setOverview]         = useState(null)
  const [leaderboard,      setLeaderboard]      = useState(null)
  const [marketplace,      setMarketplace]      = useState(null)
  const [specializations,  setSpecializations]  = useState(null)
  const [contributions,    setContributions]    = useState(null)
  const [coordination,     setCoordination]     = useState(null)
  const [health,           setHealth]           = useState(null)
  const [loading,          setLoading]          = useState(false)
  const [refreshing,       setRefreshing]       = useState(false)
  const [error,            setError]            = useState(null)

  const loadOverview = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/agent-economy/overview${forceRefresh ? '?refresh=true' : ''}`)
      setOverview(res.data?.data || res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load economy overview')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await api.get('/api/agent-economy/leaderboard')
      setLeaderboard(res.data?.data || res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load leaderboard')
      return null
    }
  }, [])

  const loadMarketplace = useCallback(async (forceRefresh = false) => {
    try {
      const res = await api.get(`/api/agent-economy/marketplace${forceRefresh ? '?refresh=true' : ''}`)
      setMarketplace(res.data?.data || res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load marketplace')
      return null
    }
  }, [])

  const loadSpecializations = useCallback(async () => {
    try {
      const res = await api.get('/api/agent-economy/specializations')
      setSpecializations(res.data?.data || res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load specializations')
      return null
    }
  }, [])

  const loadContributions = useCallback(async () => {
    try {
      const res = await api.get('/api/agent-economy/contributions')
      setContributions(res.data?.data || res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load contributions')
      return null
    }
  }, [])

  const loadCoordination = useCallback(async () => {
    try {
      const res = await api.get('/api/agent-economy/coordination')
      setCoordination(res.data?.data || res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load coordination')
      return null
    }
  }, [])

  const loadHealth = useCallback(async () => {
    try {
      const res = await api.get('/api/agent-economy/health')
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
      const [overviewRes, leaderboardRes, marketplaceRes] = await Promise.all([
        api.get(`/api/agent-economy/overview${forceRefresh ? '?refresh=true' : ''}`),
        api.get('/api/agent-economy/leaderboard'),
        api.get('/api/agent-economy/marketplace'),
      ])
      setOverview(overviewRes.data?.data || overviewRes.data)
      setLeaderboard(leaderboardRes.data?.data || leaderboardRes.data)
      setMarketplace(marketplaceRes.data?.data || marketplaceRes.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDetails = useCallback(async () => {
    try {
      const [specRes, contribRes, coordRes] = await Promise.all([
        api.get('/api/agent-economy/specializations'),
        api.get('/api/agent-economy/contributions'),
        api.get('/api/agent-economy/coordination'),
      ])
      setSpecializations(specRes.data?.data || specRes.data)
      setContributions(contribRes.data?.data || contribRes.data)
      setCoordination(coordRes.data?.data || coordRes.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load details')
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    try {
      await api.post('/api/agent-economy/refresh')
      await loadDashboard(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to refresh')
    } finally {
      setRefreshing(false)
    }
  }, [loadDashboard])

  return {
    overview, leaderboard, marketplace, specializations, contributions, coordination, health,
    loading, refreshing, error,
    loadOverview, loadLeaderboard, loadMarketplace, loadSpecializations,
    loadContributions, loadCoordination, loadHealth,
    loadDashboard, loadDetails, refreshAll,
  }
}
