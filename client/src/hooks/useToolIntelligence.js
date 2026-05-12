import { useState, useCallback } from 'react'
import api from '../services/api.service'

/**
 * Hook for the Phase 6A intelligence pipeline.
 * Manages analyze + blueprint states with loading + error handling.
 */
export function useToolIntelligence() {
  const [intelligence,     setIntelligence]     = useState(null)
  const [blueprint,        setBlueprint]        = useState(null)
  const [loading,          setLoading]          = useState(false)
  const [blueprintLoading, setBlueprintLoading] = useState(false)
  const [error,            setError]            = useState(null)

  const analyze = useCallback(async (prompt, category) => {
    if (!category) return null
    setLoading(true)
    setError(null)
    setBlueprint(null)
    try {
      const res = await api.post('/api/factory/intelligence/analyze', { prompt, category })
      setIntelligence(res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.error || 'Intelligence analysis failed')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBlueprint = useCallback(async (prompt, category, analysis, ideaId) => {
    setBlueprintLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/factory/intelligence/blueprint', {
        prompt,
        category,
        analysis: analysis || null,
        ideaId:   ideaId   || null,
      })
      setBlueprint(res.data.blueprint)
      return res.data.blueprint
    } catch (err) {
      setError(err.response?.data?.error || 'Blueprint generation failed')
      return null
    } finally {
      setBlueprintLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIntelligence(null)
    setBlueprint(null)
    setError(null)
  }, [])

  return {
    intelligence,
    blueprint,
    loading,
    blueprintLoading,
    error,
    analyze,
    fetchBlueprint,
    reset,
  }
}
