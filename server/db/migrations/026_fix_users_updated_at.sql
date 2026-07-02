-- ════════════════════════════════════════════════════════════════════════════════
-- AWE-OS Migration 026 — Fix broken users_updated_at trigger
--
-- Migration 005 created `public.users` via CREATE TABLE IF NOT EXISTS with an
-- updated_at column, then attached a BEFORE UPDATE trigger that sets
-- NEW.updated_at. Since the live `users` table already existed at that point
-- (predating tracked migrations) and lacks an updated_at column, the CREATE
-- TABLE was a no-op but the CREATE TRIGGER was not — it attached the trigger
-- to the real table anyway.
--
-- Net effect: every UPDATE on `users` (role changes, password resets,
-- subscription flips, etc.) has been failing with:
--   record "new" has no field "updated_at"
--
-- Fix: add the column the trigger already assumes exists. Purely additive —
-- no code currently reads users.updated_at, so this only starts populating it
-- going forward and unblocks the trigger.
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS is idempotent.
-- ════════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
