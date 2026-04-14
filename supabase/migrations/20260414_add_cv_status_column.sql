-- Add status column to cv table with enum type
CREATE TYPE "public"."cv_status" AS ENUM (
    'new',
    'shortlisted',
    'reviewed',
    'rejected'
);

ALTER TYPE "public"."cv_status" OWNER TO "postgres";

-- Add status column to cv table with default 'new'
ALTER TABLE "public"."cv"
ADD COLUMN "status" "public"."cv_status" DEFAULT 'new'::"public"."cv_status" NOT NULL;
