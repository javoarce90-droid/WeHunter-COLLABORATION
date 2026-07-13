-- Backfill: los memberships que ya existían antes del tour de bienvenida no deben verlo
-- de golpe en su próximo ingreso. Solo las membership nuevas (creadas después de esta
-- migración) arrancan con onboarding_dismissed_at = null.
UPDATE "memberships" SET "onboarding_dismissed_at" = now() WHERE "onboarding_dismissed_at" IS NULL;