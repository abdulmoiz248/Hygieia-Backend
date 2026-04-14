

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."appointment_cancelled_by" AS ENUM (
    'doctor',
    'patient'
);


ALTER TYPE "public"."appointment_cancelled_by" OWNER TO "postgres";

CREATE TYPE "public"."prescription_status" AS ENUM (
    'active',
    'completed'
);


ALTER TYPE "public"."prescription_status" OWNER TO "postgres";

CREATE TYPE "public"."user_role" AS ENUM (
    'patient',
    'nutritionist',
    'doctor',
    'admin',
    'lab_technician'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";

CREATE TYPE "public"."cv_status" AS ENUM (
    'new',
    'shortlisted',
    'reviewed',
    'rejected'
);


ALTER TYPE "public"."cv_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
        AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "time" time without time zone NOT NULL,
    "status" "text" NOT NULL,
    "type" "text" NOT NULL,
    "notes" "text",
    "report" "text",
    "mode" "text" NOT NULL,
    "data_shared" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "link" "text",
    "start_link" "text",
    "diet_plan_id" "uuid",
    "cancelled_by" "public"."appointment_cancelled_by",
    "cancellation_reason" "text",
    "prescription_id" "uuid",
    CONSTRAINT "appointments_mode_check" CHECK (("mode" = ANY (ARRAY['physical'::"text", 'online'::"text"]))),
    CONSTRAINT "appointments_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "appointments_type_check" CHECK (("type" = ANY (ARRAY['consultation'::"text", 'follow-up'::"text", 'emergency'::"text"])))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blogcategory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text"
);


ALTER TABLE "public"."blogcategory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blogpost" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "excerpt" "text",
    "content" "text",
    "author" "text",
    "publishedat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "readTime" integer,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "image" "text",
    "featured" boolean DEFAULT false,
    "doctorId" "uuid",
    "category" "text",
    "verified" boolean DEFAULT false
);


ALTER TABLE "public"."blogpost" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booked_lab_tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "lab_technician_id" "uuid",
    "scheduled_date" "date" NOT NULL,
    "scheduled_time" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "booked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "location" "text",
    "instructions" "text"[],
    CONSTRAINT "booked_lab_tests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."booked_lab_tests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cv" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fullName" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "doctorField" "text",
    "cvLink" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "experience" "text",
    "status" "public"."cv_status" DEFAULT 'new'::"public"."cv_status" NOT NULL,
    CONSTRAINT "cv_role_check" CHECK (("role" = ANY (ARRAY['doctor'::"text", 'nutritionist'::"text", 'lab_technician'::"text"])))
);


ALTER TABLE "public"."cv" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."diet_plan" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "daily_calories" "text" NOT NULL,
    "protein" "text" NOT NULL,
    "carbs" "text" NOT NULL,
    "fat" "text" NOT NULL,
    "deficiency" "text" NOT NULL,
    "notes" "text",
    "calories_burned" "text" NOT NULL,
    "exercise" "text" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "patient_id" "uuid" NOT NULL,
    "nutritionist_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."diet_plan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."faqs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "faqs_answer_check" CHECK (("length"(TRIM(BOTH FROM "answer")) > 0)),
    CONSTRAINT "faqs_question_check" CHECK (("length"(TRIM(BOTH FROM "question")) > 0))
);


ALTER TABLE "public"."faqs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fitbit_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "fitbit_user_id" character varying(255) NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "scope" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fitbit_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fitness" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "patient_id" "uuid",
    "steps" integer,
    "water" numeric,
    "sleep" numeric,
    "calories_burned" integer,
    "calories_intake" integer,
    "fat" numeric,
    "protein" numeric,
    "carbs" numeric,
    "walk_calories_burned" numeric DEFAULT '0'::numeric
);


ALTER TABLE "public"."fitness" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lab_technician_profiles" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "phone" "text",
    "img" "text",
    "gender" "text",
    "dateofbirth" "date",
    "personal_email" "text",
    CONSTRAINT "lab_technician_profiles_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'Male'::"text", 'female'::"text", 'Female'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."lab_technician_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lab_tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "price" numeric NOT NULL,
    "duration" "text",
    "preparation_instructions" "text"[],
    "record_type" "text" DEFAULT 'report'::"text" NOT NULL,
    "unit" "text",
    "optimal_range" "text"
);


ALTER TABLE "public"."lab_tests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medical_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booked_test_id" "uuid",
    "patient_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "record_type" "text" NOT NULL,
    "date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "file_url" "text",
    "doctor_name" "text",
    "results" "text",
    CONSTRAINT "medical_records_record_type_check" CHECK (("record_type" = ANY (ARRAY['lab-result'::"text", 'prescription'::"text", 'scan'::"text", 'report'::"text"])))
);


ALTER TABLE "public"."medical_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medication_adherence_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "prescription_id" "uuid" NOT NULL,
    "medication_id" "text" NOT NULL,
    "taken" boolean NOT NULL,
    "taken_at" timestamp with time zone NOT NULL,
    "scheduled_time" "text",
    "source" "text" DEFAULT 'patient-web'::"text" NOT NULL,
    "taken_date" "date" GENERATED ALWAYS AS ((("taken_at" AT TIME ZONE 'UTC'::"text"))::"date") STORED,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."medication_adherence_logs" OWNER TO "postgres";


CREATE UNIQUE INDEX "medication_adherence_unique_patient_prescription_medication_day" ON "public"."medication_adherence_logs" USING "btree" ("patient_id", "prescription_id", "medication_id", "taken_date");



CREATE TABLE IF NOT EXISTS "public"."newsletter" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."newsletter" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "notification_msg" "text" NOT NULL,
    "action" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "title" "text",
    "is_read" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointment_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "provider_role" "text" NOT NULL,
    "rating" integer NOT NULL,
    "review_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "appointment_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "appointment_reviews_appointment_unique" UNIQUE ("appointment_id"),
    CONSTRAINT "appointment_reviews_provider_role_check" CHECK (("provider_role" = ANY (ARRAY['doctor'::"text", 'nutritionist'::"text"]))),
    CONSTRAINT "appointment_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "appointment_reviews_appointment_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE,
    CONSTRAINT "appointment_reviews_patient_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "appointment_reviews_provider_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);


ALTER TABLE "public"."appointment_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prescriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "medications" "jsonb" NOT NULL,
    "notes" "text",
    "start_date" "date",
    "end_date" "date",
    "status" "public"."prescription_status" DEFAULT 'active'::"public"."prescription_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "prescriptions_date_range_valid" CHECK ((("start_date" IS NULL) OR ("end_date" IS NULL) OR ("end_date" >= "start_date"))),
    CONSTRAINT "prescriptions_medications_is_array" CHECK (("jsonb_typeof"("medications") = 'array'::"text"))
);


ALTER TABLE "public"."prescriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referred_tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "referrer_id" "uuid" NOT NULL,
    "dismissed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."referred_tests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'patient'::"public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "otp" "text",
    "is_verified" boolean DEFAULT false,
    "personal_email" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "routine_id" "text" NOT NULL,
    "exercises" "jsonb" NOT NULL,
    "total_duration" integer NOT NULL,
    "total_calories" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."workout_sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blogcategory"
    ADD CONSTRAINT "blogcategory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blogpost"
    ADD CONSTRAINT "blogpost_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booked_lab_tests"
    ADD CONSTRAINT "booked_lab_tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cv"
    ADD CONSTRAINT "cv_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."diet_plan"
    ADD CONSTRAINT "diet_plan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faqs"
    ADD CONSTRAINT "faqs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fitbit_tokens"
    ADD CONSTRAINT "fitbit_tokens_fitbit_user_id_key" UNIQUE ("fitbit_user_id");



ALTER TABLE ONLY "public"."fitbit_tokens"
    ADD CONSTRAINT "fitbit_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fitbit_tokens"
    ADD CONSTRAINT "fitbit_tokens_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."fitness"
    ADD CONSTRAINT "fitness_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_technician_profiles"
    ADD CONSTRAINT "lab_technician_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_tests"
    ADD CONSTRAINT "lab_tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medical_records"
    ADD CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medication_adherence_logs"
    ADD CONSTRAINT "medication_adherence_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."newsletter"
    ADD CONSTRAINT "newsletter_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."newsletter"
    ADD CONSTRAINT "newsletter_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referred_tests"
    ADD CONSTRAINT "referred_tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_faqs_order" ON "public"."faqs" USING "btree" ("order_index", "created_at");



CREATE INDEX "idx_fitbit_tokens_fitbit_user_id" ON "public"."fitbit_tokens" USING "btree" ("fitbit_user_id");



CREATE INDEX "idx_fitbit_tokens_user_id" ON "public"."fitbit_tokens" USING "btree" ("user_id");


CREATE INDEX "idx_appointment_reviews_patient" ON "public"."appointment_reviews" USING "btree" ("patient_id", "created_at" DESC);


CREATE INDEX "idx_appointment_reviews_provider" ON "public"."appointment_reviews" USING "btree" ("provider_id", "provider_role", "created_at" DESC);



CREATE INDEX "idx_med_adherence_patient_taken_at" ON "public"."medication_adherence_logs" USING "btree" ("patient_id", "taken_at" DESC);



CREATE INDEX "idx_med_adherence_prescription" ON "public"."medication_adherence_logs" USING "btree" ("prescription_id");



CREATE INDEX "idx_prescriptions_created_at" ON "public"."prescriptions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_prescriptions_doctor_id" ON "public"."prescriptions" USING "btree" ("doctor_id");



CREATE INDEX "idx_prescriptions_patient_id" ON "public"."prescriptions" USING "btree" ("patient_id");



CREATE INDEX "idx_prescriptions_status" ON "public"."prescriptions" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "trg_medication_adherence_updated_at" BEFORE UPDATE ON "public"."medication_adherence_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_prescriptions_updated_at" BEFORE UPDATE ON "public"."prescriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_faqs_updated_at" BEFORE UPDATE ON "public"."faqs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_diet_plan_id_fkey" FOREIGN KEY ("diet_plan_id") REFERENCES "public"."diet_plan"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id");



ALTER TABLE ONLY "public"."blogpost"
    ADD CONSTRAINT "blogpost_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."booked_lab_tests"
    ADD CONSTRAINT "booked_lab_tests_lab_technician_id_fkey" FOREIGN KEY ("lab_technician_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."booked_lab_tests"
    ADD CONSTRAINT "booked_lab_tests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booked_lab_tests"
    ADD CONSTRAINT "booked_lab_tests_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."lab_tests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."diet_plan"
    ADD CONSTRAINT "diet_plan_nutritionist_id_fkey" FOREIGN KEY ("nutritionist_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."diet_plan"
    ADD CONSTRAINT "diet_plan_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fitbit_tokens"
    ADD CONSTRAINT "fitbit_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fitness"
    ADD CONSTRAINT "fitness_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_technician_profiles"
    ADD CONSTRAINT "lab_technician_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_records"
    ADD CONSTRAINT "medical_records_booked_test_id_fkey" FOREIGN KEY ("booked_test_id") REFERENCES "public"."booked_lab_tests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."medical_records"
    ADD CONSTRAINT "medical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medication_adherence_logs"
    ADD CONSTRAINT "medication_adherence_patient_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medication_adherence_logs"
    ADD CONSTRAINT "medication_adherence_prescription_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_appointment_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_doctor_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_patient_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."referred_tests"
    ADD CONSTRAINT "referred_tests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referred_tests"
    ADD CONSTRAINT "referred_tests_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."referred_tests"
    ADD CONSTRAINT "referred_tests_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."lab_tests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow insert for authenticated users" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow update of is_read for own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Only admins can delete faqs" ON "public"."faqs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Only admins can insert faqs" ON "public"."faqs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Only admins can update faqs" ON "public"."faqs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Public faqs are viewable by everyone" ON "public"."faqs" FOR SELECT USING (true);



CREATE POLICY "Users can read their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blogcategory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blogpost" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."booked_lab_tests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cv" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."diet_plan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."faqs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fitbit_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fitness" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_technician_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_tests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medical_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."newsletter" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referred_tests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_sessions" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."blogcategory" TO "anon";
GRANT ALL ON TABLE "public"."blogcategory" TO "authenticated";
GRANT ALL ON TABLE "public"."blogcategory" TO "service_role";



GRANT ALL ON TABLE "public"."blogpost" TO "anon";
GRANT ALL ON TABLE "public"."blogpost" TO "authenticated";
GRANT ALL ON TABLE "public"."blogpost" TO "service_role";



GRANT ALL ON TABLE "public"."booked_lab_tests" TO "anon";
GRANT ALL ON TABLE "public"."booked_lab_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."booked_lab_tests" TO "service_role";



GRANT ALL ON TABLE "public"."cv" TO "anon";
GRANT ALL ON TABLE "public"."cv" TO "authenticated";
GRANT ALL ON TABLE "public"."cv" TO "service_role";



GRANT ALL ON TABLE "public"."diet_plan" TO "anon";
GRANT ALL ON TABLE "public"."diet_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."diet_plan" TO "service_role";



GRANT ALL ON TABLE "public"."faqs" TO "anon";
GRANT ALL ON TABLE "public"."faqs" TO "authenticated";
GRANT ALL ON TABLE "public"."faqs" TO "service_role";



GRANT ALL ON TABLE "public"."fitbit_tokens" TO "anon";
GRANT ALL ON TABLE "public"."fitbit_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."fitbit_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."fitness" TO "anon";
GRANT ALL ON TABLE "public"."fitness" TO "authenticated";
GRANT ALL ON TABLE "public"."fitness" TO "service_role";



GRANT ALL ON TABLE "public"."lab_technician_profiles" TO "anon";
GRANT ALL ON TABLE "public"."lab_technician_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_technician_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."lab_tests" TO "anon";
GRANT ALL ON TABLE "public"."lab_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_tests" TO "service_role";



GRANT ALL ON TABLE "public"."medical_records" TO "anon";
GRANT ALL ON TABLE "public"."medical_records" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_records" TO "service_role";



GRANT ALL ON TABLE "public"."medication_adherence_logs" TO "anon";
GRANT ALL ON TABLE "public"."medication_adherence_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."medication_adherence_logs" TO "service_role";



GRANT ALL ON TABLE "public"."newsletter" TO "anon";
GRANT ALL ON TABLE "public"."newsletter" TO "authenticated";
GRANT ALL ON TABLE "public"."newsletter" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."prescriptions" TO "anon";
GRANT ALL ON TABLE "public"."prescriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."prescriptions" TO "service_role";



GRANT ALL ON TABLE "public"."referred_tests" TO "anon";
GRANT ALL ON TABLE "public"."referred_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."referred_tests" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."workout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."workout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_sessions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






