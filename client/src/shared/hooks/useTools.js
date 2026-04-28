import { useState, useEffect, useCallback } from 'react'
import { toolsAPI } from '../../services/api.service'

export function useTools() {
  const [tools, setTools]       = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]       = useState(null)

  const fetchTools = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await toolsAPI.getAll()
      setTools(res.data?.tools ?? res.data ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load tools')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchTools() }, [fetchTools])

  return { tools, isLoading, error, refetch: fetchTools }
}
