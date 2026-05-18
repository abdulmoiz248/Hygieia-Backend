CREATE TABLE IF NOT EXISTS "public"."feedback_forms" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "title" character varying(255),
    "description" text,
    "questions" jsonb NOT NULL,
    "expiry_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid,
    CONSTRAINT "feedback_forms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."feedback_responses" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "form_id" uuid NOT NULL,
    "user_email" character varying(255) NOT NULL,
    "answers" jsonb NOT NULL,
    "hygieia_review" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "feedback_responses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "feedback_responses_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."feedback_forms"("id") ON DELETE CASCADE
);
