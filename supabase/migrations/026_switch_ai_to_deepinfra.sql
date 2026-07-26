-- ============================================
-- Migration 021: switch AI provider -> DeepInfra
-- ============================================
-- The app now calls DeepInfra's OpenAI-compatible API. DeepInfra model ids are
-- namespaced (`org/model`); legacy ids stored in ai_prompts.model from previous
-- providers (`claude-sonnet-4-5-20250929`, `gpt-4o-mini`, ...) are NOT valid on
-- DeepInfra and would fail every generation that reads its model from the DB.
--
-- Remap any non-namespaced (legacy) id to the DeepInfra text model, and change
-- the column default so future inserts don't reintroduce a stale provider id.

UPDATE public.ai_prompts
SET model = 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
WHERE model IS NULL OR model NOT LIKE '%/%';

ALTER TABLE public.ai_prompts
  ALTER COLUMN model SET DEFAULT 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
