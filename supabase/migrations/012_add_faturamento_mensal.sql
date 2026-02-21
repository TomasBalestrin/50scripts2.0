-- Add faturamento_mensal column if it doesn't exist
ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS faturamento_mensal TEXT;
