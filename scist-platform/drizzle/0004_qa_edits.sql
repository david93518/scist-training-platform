ALTER TABLE "questions" ADD COLUMN "edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "answers" ADD COLUMN "edited_at" timestamp with time zone;
