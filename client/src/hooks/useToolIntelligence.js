import { useState, useCallback } from 'react'

function gradeFromScore(score) {
  if (score >= 85) return { grade: 'A+', gradeLabel: 'Exceptional Opportunity' }
  if (score >= 75) return { grade: 'A',  gradeLabel: 'Strong Opportunity' }
  if (score >= 65) return { grade: 'B+', gradeLabel: 'Good Potential' }
  if (score >= 55) return { grade: 'B',  gradeLabel: 'Moderate Potential' }
  if (score >= 40) return { grade: 'C',  gradeLabel: 'Needs Work' }
  return              { grade: 'D',  gradeLabel: 'Low Priority' }
}

function parseRevenueRange(revenueStr) {
  if (!revenueStr) return { low: 0, high: 0 }
  const nums = revenueStr.match(/\d[\d,]*/g)?.map(n => parseInt(n.replace(/,/g, ''), 10)) || []
  return { low: nums[0] || 0, high: nums[1] || nums[0] || 0 }
}

function mapClaudeResponse(raw, category) {
  const overall    = Math.min(100, Math.max(0, raw.overallScore       || 0))
  const seoScore   = Math.min(100, Math.max(0, raw.seoScore           || 0))
  const monetScore = Math.min(100, Math.max(0, raw.monetizationScore  || 0))
  const uniqScore  = Math.min(100, Math.max(0, raw.uniquenessScore    || 0))
  const { grade, gradeLabel } = gradeFromScore(overall)
  const revenue = parseRevenueRange(raw.estimatedRevenue)
  return {
    analysis: {
      uniquenessScore: uniqScore,
      complexity: overall >= 70 ? 'medium' : overall >= 50 ? 'low' : 'high',
      estimatedBuildTimeHours: overall >= 70 ? 16 : 8,
      targetAudience: category || 'General users',
      problemSolved: raw.verdictReason || '',
      coreFeatures: raw.topKeywords?.slice(0, 4) || [],
    },
    monetization: {
      monetizationScore: monetScore,
      primaryModel: raw.priorityRating || 'Freemium',
      estimatedMonthlyRevenue: revenue,
      paybackPeriodMonths: monetScore >= 70 ? 3 : monetScore >= 50 ? 6 : 12,
      viableModels: ['Freemium', 'Ads', 'Pro tier'].slice(0, monetScore >= 60 ? 3 : 1),
    },
    seo: {
      opportunityScore: seoScore,
      difficultyScore: Math.max(10, 100 - seoScore),
      searchIntent: raw.competition || 'informational',
      trafficEstimate: { monthlyLow: revenue.low * 20, monthlyHigh: revenue.high * 20 },
      timeToRankEstimate: seoScore >= 70 ? '2–4 months' : '4–8 months',
      keywordClusters: [{ keywords: raw.topKeywords || [] }],
    },
    score: {
      overallScore: overall,
      grade,
      gradeLabel,
      launchRecommendation: overall >= 60,
      reasoning: raw.verdictReason
        ? [{ icon: '🏆', text: raw.verdictReason }]
        : [],
    },
    duplicateCheck: {},
    historical: {},
  }
}

export function useToolIntelligence() {
  const [intelligence,     setIntelligence]     = useState(null)
  const [blueprint,        setBlueprint]        = useState(null)
  const [generatedPrompt,  setGeneratedPrompt]  = useState(null)
  const [generatedIdeas,   setGeneratedIdeas]   = useState([])
  const [loading,          setLoading]          = useState(false)
  const [blueprintLoading, setBlueprintLoading] = useState(false)
  const [promptLoading,    setPromptLoading]    = useState(false)
  const [ideasLoading,     setIdeasLoading]     = useState(false)
  const [error,            setError]            = useState(null)

  const analyze = useCallback(async (prompt, category) => {
    if (!category) return null
    setLoading(true)
    setError(null)
    setBlueprint(null)
    setGeneratedPrompt(null)
    try {
      const res = await fetch('/api/analyze-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || '',
        },
        body: JSON.stringify({ toolIdea: prompt, category }),
      })
      if (!res.ok) throw new Error(`Analysis error ${res.status}`)
      const json = await res.json()
      const text = json.content?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error(`No JSON in response — got keys: ${Object.keys(json).join(', ')}`)
      const raw = JSON.parse(jsonMatch[0])
      const mapped = mapClaudeResponse(raw, category)
      setIntelligence(mapped)
      return mapped
    } catch (err) {
      setError(err.message || 'Intelligence analysis failed')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBlueprint = useCallback(async (toolIdea, category, analysis) => {
    setBlueprintLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-blueprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || '',
        },
        body: JSON.stringify({ toolIdea, category, analysis: analysis || null }),
      })
      if (!res.ok) throw new Error(`Blueprint error ${res.status}`)
      const bp = await res.json()
      setBlueprint(bp)
      return bp
    } catch (err) {
      setError(err.message || 'Blueprint generation failed')
      return null
    } finally {
      setBlueprintLoading(false)
    }
  }, [])

  const fetchPrompt = useCallback(async (blueprint, analysis, toolIdea) => {
    setPromptLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || '',
        },
        body: JSON.stringify({ blueprint, analysis: analysis || null, toolIdea }),
      })
      if (!res.ok) throw new Error(`Prompt error ${res.status}`)
      const { prompt } = await res.json()
      setGeneratedPrompt(prompt)
      return prompt
    } catch (err) {
      setError(err.message || 'Prompt generation failed')
      return null
    } finally {
      setPromptLoading(false)
    }
  }, [])

  const fetchIdeas = useCallback(async (category, count = 5) => {
    setIdeasLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || '',
        },
        body: JSON.stringify({ category, count }),
      })
      if (!res.ok) throw new Error(`Ideas error ${res.status}`)
      const { ideas } = await res.json()
      setGeneratedIdeas(ideas || [])
      return ideas || []
    } catch (err) {
      setError(err.message || 'Ideas generation failed')
      return []
    } finally {
      setIdeasLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIntelligence(null)
    setBlueprint(null)
    setGeneratedPrompt(null)
    setGeneratedIdeas([])
    setError(null)
  }, [])

  const resetBlueprint = useCallback(() => {
    setBlueprint(null)
    setGeneratedPrompt(null)
  }, [])

  return {
    intelligence,
    blueprint,
    generatedPrompt,
    generatedIdeas,
    loading,
    blueprintLoading,
    promptLoading,
    ideasLoading,
    error,
    analyze,
    fetchBlueprint,
    fetchPrompt,
    fetchIdeas,
    reset,
    resetBlueprint,
  }
}
