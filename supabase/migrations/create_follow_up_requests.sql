-- ============================================================
-- Follow-Up Requests Table
-- ============================================================

CREATE TABLE IF NOT EXISTS follow_up_requests (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider_role TEXT NOT NULL CHECK (provider_role IN ('doctor', 'nutritionist')),
  
  -- Request details
  reason        TEXT,
  suggested_date DATE, -- Optional date suggestion by provider
  
  -- Status tracking
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'booked', 'dismissed')),
                  
  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for patient lookups
CREATE INDEX IF NOT EXISTS idx_follow_up_requests_patient
  ON follow_up_requests(patient_id);

-- Index for provider lookups
CREATE INDEX IF NOT EXISTS idx_follow_up_requests_provider
  ON follow_up_requests(provider_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_follow_up_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_follow_up_requests_updated_at ON follow_up_requests;
CREATE TRIGGER trg_follow_up_requests_updated_at
  BEFORE UPDATE ON follow_up_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_up_requests_updated_at();
