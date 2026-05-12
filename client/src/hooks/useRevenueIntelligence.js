import { useState, useCallback } from 'react'
import api from '../services/api.service'

/**
 * Hook for Phase 6C Revenue Intelligence Engine.
 * Manages analytics, predictions, pricing, optimization, forecast, and learning signals.
 */
export function useRevenueIntelligence() {
  const [analytics,     setAnalytics]     = useState(null)
  const [predictions,   setPredictions]   = useState(null)
  const [pricing,       setPricing]       = useState(null)
  const [optimization,  setOptimization]  = useState(null)
  const [forecast,      setForecast]      = useState(null)
  const [learning,      setLearning]      = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [refreshing,    setRefreshing]    = useState(false)
  const [error,         setError]         = useState(null)

  const loadAnalytics = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/revenue-intel/analytics${forceRefresh ? '?refresh=true' : ''}`)
      setAnalytics(res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load revenue analytics')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPredictions = useCallback(async () => {
    try {
      const res = await api.get('/api/revenue-intel/predictions')
      setPredictions(res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load predictions')
      return null
    }
  }, [])

  const loadPricing = useCallback(async () => {
    try {
      const res = await api.get('/api/revenue-intel/pricing')
      setPricing(res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load pricing data')
      return null
    }
  }, [])

  const loadOptimization = useCallback(async () => {
    try {
      const res = await api.get('/api/revenue-intel/optimization')
      setOptimization(res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load optimization data')
      return null
    }
  }, [])

  const loadForecast = useCallback(async () => {
    try {
      const res = await api.get('/api/revenue-intel/forecast')
      setForecast(res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load forecast')
      return null
    }
  }, [])

  const loadLearning = useCallback(async (forceRefresh = false) => {
    try {
      const res = await api.get(`/api/revenue-intel/learning${forceRefresh ? '?refresh=true' : ''}`)
      setLearning(res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load learning signals')
      return null
    }
  }, [])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [analyticsRes, forecastRes, learningRes] = await Promise.all([
        api.get('/api/revenue-intel/analytics'),
        api.get('/api/revenue-intel/forecast'),
        api.get('/api/revenue-intel/learning'),
      ])
      setAnalytics(analyticsRes.data)
      setForecast(forecastRes.data)
      setLearning(learningRes.data)
      return { analytics: analyticsRes.data, forecast: forecastRes.data, learning: learningRes.data }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load revenue dashboard')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const loadOptimizationCenter = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pricingRes, optRes] = await Promise.all([
        api.get('/api/revenue-intel/pricing'),
        api.get('/api/revenue-intel/optimization'),
      ])
      setPricing(pricingRes.data)
      setOptimization(optRes.data)
      return { pricing: pricingRes.data, optimization: optRes.data }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load optimization center')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const res = await api.post('/api/revenue-intel/refresh')
      await loadDashboard()
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Refresh failed')
      return null
    } finally {
      setRefreshing(false)
    }
  }, [loadDashboard])

  const runToolPipeline = useCallback(async (toolId) => {
    try {
      const res = await api.post(`/api/revenue-intel/tool/${toolId}`)
      return { success: true, data: res.data }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Tool pipeline failed' }
    }
  }, [])

  const reset = useCallback(() => {
    setAnalytics(null); setPredictions(null); setPricing(null)
    setOptimization(null); setForecast(null); setLearning(null)
    setError(null)
  }, [])

  return {
    analytics, predictions, pricing, optimization, forecast, learning,
    loading, refreshing, error,
    loadAnalytics, loadPredictions, loadPricing,
    loadOptimization, loadForecast, loadLearning,
    loadDashboard, loadOptimizationCenter,
    refreshAll, runToolPipeline, reset,
  }
}
