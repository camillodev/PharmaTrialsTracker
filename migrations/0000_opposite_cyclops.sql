CREATE TABLE IF NOT EXISTS "lab_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"test_type" text NOT NULL,
	"value" numeric NOT NULL,
	"units" text NOT NULL,
	"result_date" timestamp NOT NULL,
	"file_hash" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outlier_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"reported_date" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patients" (
	"id" text PRIMARY KEY NOT NULL,
	"trial_id" text NOT NULL,
	"enroll_date" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "symptoms" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"symptom" text NOT NULL,
	"severity" integer NOT NULL,
	"reported_date" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trials" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outlier_logs" ADD CONSTRAINT "outlier_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patients" ADD CONSTRAINT "patients_trial_id_trials_id_fk" FOREIGN KEY ("trial_id") REFERENCES "public"."trials"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "symptoms" ADD CONSTRAINT "symptoms_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
