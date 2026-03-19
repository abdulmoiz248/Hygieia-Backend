-- Allow multiple medication adherence event rows per day for the same medication.
-- Required for insert-only logging behavior in appointments service.
DROP INDEX IF EXISTS public.uq_med_adherence_daily;
