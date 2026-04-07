-- Prevent duplicate medication adherence rows for the same patient, prescription, medication, and UTC day.
WITH ranked_logs AS (
	SELECT
		id,
		ROW_NUMBER() OVER (
			PARTITION BY patient_id, prescription_id, medication_id, taken_date
			ORDER BY updated_at DESC, created_at DESC, id DESC
		) AS rn
	FROM public.medication_adherence_logs
)
DELETE FROM public.medication_adherence_logs
WHERE id IN (SELECT id FROM ranked_logs WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS "medication_adherence_unique_patient_prescription_medication_day"
ON "public"."medication_adherence_logs" USING btree
("patient_id", "prescription_id", "medication_id", "taken_date");