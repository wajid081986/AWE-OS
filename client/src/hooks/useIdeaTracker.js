import { useState, useCallback } from 'react'

const STORAGE_KEY = 'awe_idea_tracker_v1'
const MAX_IDEAS = 50

function loadIdeas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persist(ideas) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas))
  } catch {}
}

export function useIdeaTracker() {
  const [ideas, setIdeas] = useState(() => loadIdeas())

  const saveIdea = useCallback((ideaData) => {
    const entry = {
      id: `idea_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      status: 'analyzed',
      ...ideaData,
    }
    setIdeas(prev => {
      const next = [entry, ...prev].slice(0, MAX_IDEAS)
      persist(next)
      return next
    })
    return entry
  }, [])

  const updateIdeaStatus = useCallback((id, status) => {
    setIdeas(prev => {
      const next = prev.map(i =>
        i.id === id ? { ...i, status, updatedAt: new Date().toISOString() } : i
      )
      persist(next)
      return next
    })
  }, [])

  const deleteIdea = useCallback((id) => {
    setIdeas(prev => {
      const next = prev.filter(i => i.id !== id)
      persist(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setIdeas([])
    persist([])
  }, [])

  const stats = {
    total:     ideas.length,
    analyzed:  ideas.filter(i => i.status === 'analyzed').length,
    blueprint: ideas.filter(i => i.status === 'blueprint').length,
    prompted:  ideas.filter(i => i.status === 'prompted').length,
    building:  ideas.filter(i => i.status === 'building').length,
    live:      ideas.filter(i => i.status === 'live').length,
  }

  return {
    ideas,
    stats,
    saveIdea,
    updateIdeaStatus,
    deleteIdea,
    clearAll,
  }
}
