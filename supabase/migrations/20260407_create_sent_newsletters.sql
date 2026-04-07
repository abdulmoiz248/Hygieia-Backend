CREATE TABLE IF NOT EXISTS public.sent_newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('manual', 'blogpost')),
  subject text NOT NULL,
  html text,
  blogpost_id uuid REFERENCES public.blogpost(id) ON DELETE SET NULL,
  newsletter_link text,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sent_newsletters_created_at
  ON public.sent_newsletters (created_at DESC);
