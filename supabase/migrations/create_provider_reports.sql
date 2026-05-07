-- ============================================================
-- Provider Reports Table (for reporting doctors/nutritionists)
-- ============================================================

CREATE TABLE IF NOT EXISTS provider_reports (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- The provider being reported
  reported_provider_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_provider_role TEXT NOT NULL CHECK (reported_provider_role IN ('doctor', 'nutritionist')),

  -- Report content
  reason        TEXT NOT NULL,
  description   TEXT,
  evidence_urls TEXT[] DEFAULT '{}',     -- up to 3 Cloudinary URLs

  -- Admin workflow
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes   TEXT,
  warning_issued BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by reported provider
CREATE INDEX IF NOT EXISTS idx_provider_reports_provider
  ON provider_reports(reported_provider_id);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_provider_reports_status
  ON provider_reports(status);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_provider_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_provider_reports_updated_at ON provider_reports;
CREATE TRIGGER trg_provider_reports_updated_at
  BEFORE UPDATE ON provider_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_reports_updated_at();

-- Enable Row Level Security (optional - disable if using service role key)
-- ALTER TABLE provider_reports ENABLE ROW LEVEL SECURITY;
