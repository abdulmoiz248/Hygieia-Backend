CREATE TABLE IF NOT EXISTS public.appointment_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appointment_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    provider_id uuid NOT NULL,
    provider_role text NOT NULL,
    rating integer NOT NULL,
    review_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT appointment_reviews_pkey PRIMARY KEY (id),
    CONSTRAINT appointment_reviews_appointment_unique UNIQUE (appointment_id),
    CONSTRAINT appointment_reviews_provider_role_check CHECK (provider_role = ANY (ARRAY['doctor'::text, 'nutritionist'::text])),
    CONSTRAINT appointment_reviews_rating_check CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT appointment_reviews_appointment_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE,
    CONSTRAINT appointment_reviews_patient_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT appointment_reviews_provider_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appointment_reviews_provider ON public.appointment_reviews USING btree (provider_id, provider_role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointment_reviews_patient ON public.appointment_reviews USING btree (patient_id, created_at DESC);

CREATE TRIGGER appointment_reviews_set_updated_at
BEFORE UPDATE ON public.appointment_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
