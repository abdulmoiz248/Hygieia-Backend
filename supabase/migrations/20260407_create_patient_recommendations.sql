CREATE TABLE IF NOT EXISTS public.patient_recommendations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recommendations jsonb NOT NULL,
    context_hash text,
    source text NOT NULL DEFAULT 'langgraph-groq',
    generated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_recommendations_patient_generated
    ON public.patient_recommendations (patient_id, generated_at DESC);

ALTER TABLE public.patient_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage patient recommendations"
ON public.patient_recommendations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
