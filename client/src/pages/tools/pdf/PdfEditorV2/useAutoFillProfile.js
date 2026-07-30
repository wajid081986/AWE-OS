import { useCallback, useState } from 'react'
import { PROFILE_FIELDS, PROFILE_FIELD_KEYWORDS } from './constants'

const STORAGE_KEY = 'awe-pdf-editor-profile-v1'

const emptyProfile = () => Object.fromEntries(PROFILE_FIELDS.map((k) => [k, '']))

function readProfile() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyProfile()
    return { ...emptyProfile(), ...JSON.parse(raw) }
  } catch {
    return emptyProfile()
  }
}

function normalize(name) {
  return (name || '').toLowerCase().replace(/[^a-z]/g, '')
}

/**
 * Reads/writes the user's own autofill profile (name/email/phone/address/...)
 * to localStorage only — the user's own data staying on their own device,
 * never transmitted anywhere, so this sits outside the Phase 3 privacy
 * exception discussed in docs/batches/batch-36-plan.md. `load`/`save` touch
 * `window.localStorage` only inside callbacks, never at module scope.
 */
export function useAutoFillProfile() {
  const [profile, setProfile] = useState(emptyProfile)

  const load = useCallback(() => {
    setProfile(readProfile())
  }, [])

  const save = useCallback((next) => {
    setProfile(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage unavailable (private browsing, quota) — the profile still
      // works for the rest of this session via React state, it just won't
      // persist to the next one.
    }
  }, [])

  // Best-effort keyword match of each detected field's name against
  // PROFILE_FIELD_KEYWORDS — real-world PDF field names vary too much for a
  // general solution, so this only returns matches it's confident about,
  // never guesses; every match stays manually editable afterward in
  // FormFieldLayer.
  // Accepts an optional profile override so a caller that just saved a new
  // profile (e.g. ProfileModal's "Save & autofill") can match against those
  // values immediately, without waiting a render for `profile` state to
  // reflect the save.
  const matchFields = useCallback((fields, profileOverride) => {
    const source = profileOverride ?? profile
    const patch = {}
    for (const field of fields) {
      if (field.type !== 'text') continue
      const normalized = normalize(field.name)
      for (const key of PROFILE_FIELDS) {
        if (!source[key]) continue
        if (PROFILE_FIELD_KEYWORDS[key].some((kw) => normalized.includes(kw))) {
          patch[field.name] = source[key]
          break
        }
      }
    }
    return patch
  }, [profile])

  return { profile, load, save, matchFields }
}
