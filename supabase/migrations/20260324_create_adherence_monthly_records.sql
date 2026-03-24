-- Migration: Create monthly adherence tracking table
-- Date: 2026-03-24
-- Purpose: Store monthly adherence and health score data for patients

CREATE TABLE IF NOT EXISTS "public"."adherence_monthly_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "month_year" "text" NOT NULL,
    "adherence_score" integer NOT NULL,
    "health_score" integer NOT NULL,
    "medication_adherence" integer NOT NULL,
    "diet_adherence" integer NOT NULL,
    "total_days" integer NOT NULL,
    "notes" "text",
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "adherence_monthly_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "adherence_monthly_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "adherence_score_range" CHECK (("adherence_score" >= 0 AND "adherence_score" <= 100)),
    CONSTRAINT "health_score_range" CHECK (("health_score" >= 0 AND "health_score" <= 100)),
    CONSTRAINT "medication_adherence_range" CHECK (("medication_adherence" >= 0 AND "medication_adherence" <= 100)),
    CONSTRAINT "diet_adherence_range" CHECK (("diet_adherence" >= 0 AND "diet_adherence" <= 100))
);

ALTER TABLE "public"."adherence_monthly_records" OWNER TO "postgres";

-- Create unique index on patient_id and month_year to prevent duplicates
CREATE UNIQUE INDEX "adherence_monthly_unique_patient_month" 
ON "public"."adherence_monthly_records"("patient_id", "month_year");

-- Create index for faster queries
CREATE INDEX "adherence_monthly_patient_idx" 
ON "public"."adherence_monthly_records"("patient_id");

CREATE INDEX "adherence_monthly_month_idx" 
ON "public"."adherence_monthly_records"("month_year");

-- Add trigger for updated_at
CREATE TRIGGER "update_adherence_monthly_records_updated_at" BEFORE UPDATE 
ON "public"."adherence_monthly_records" FOR EACH ROW 
EXECUTE FUNCTION "public"."update_updated_at_column"();
