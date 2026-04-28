ALTER TABLE "public"."lab_technician_profiles"
ADD COLUMN "created_at" timestamp with time zone DEFAULT now();

UPDATE "public"."lab_technician_profiles"
SET "created_at" = COALESCE("created_at", now())
WHERE "created_at" IS NULL;