import { useState, useCallback } from 'react'
import api from '../services/api.service'

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

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
  const overall  = Math.min(100, Math.max(0, raw.overallScore      || 0))
  const seoScore = Math.min(100, Math.max(0, raw.seoScore          || 0))
  const monetScore = Math.min(100, Math.max(0, raw.monetizationScore || 0))
  const uniqScore  = Math.min(100, Math.max(0, raw.uniquenessScore  || 0))
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

/**
 * Hook for the Phase 6A intelligence pipeline.
 * analyze() calls Anthropic directly from the browser.
 * fetchBlueprint() still uses the backend.
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
      if (!ANTHROPIC_KEY) throw new Error('VITE_ANTHROPIC_API_KEY is not set')
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Analyze this tool idea: "${prompt}" in category: "${category}". Return ONLY valid JSON (no markdown, no explanation): { "overallScore": number 0-100, "seoScore": number 0-100, "monetizationScore": number 0-100, "uniquenessScore": number 0-100, "verdict": string, "verdictReason": string, "topKeywords": string[], "estimatedRevenue": string like "$500-$2000/mo", "competition": string, "priorityRating": string }`,
          }],
        }),
      })
      if (!res.ok) throw new Error(`Anthropic API error ${res.status}`)
      const json = await res.json()
      const text = json.content?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in Claude response')
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
