CREATE TYPE "public"."category" AS ENUM('web', 'crypto', 'reverse', 'pwn', 'linux', 'misc');--> statement-breakpoint
CREATE TYPE "public"."challenge_kind" AS ENUM('challenge', 'box');--> statement-breakpoint
CREATE TYPE "public"."connection_type" AS ENUM('none', 'http', 'nc', 'ssh');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard', 'insane');--> statement-breakpoint
CREATE TYPE "public"."event_mode" AS ENUM('online', 'offline');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('clinic', 'live', 'contest', 'workshop');--> statement-breakpoint
CREATE TYPE "public"."instance_status" AS ENUM('starting', 'running', 'stopped', 'error');--> statement-breakpoint
CREATE TYPE "public"."question_scope" AS ENUM('lesson', 'challenge');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'ta', 'instructor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."video_provider" AS ENUM('none', 'youtube', 'stream');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('none', 'uploading', 'processing', 'ready', 'error');--> statement-breakpoint
CREATE TYPE "public"."xp_reason" AS ENUM('checkpoint', 'lesson', 'solve', 'hint', 'event', 'admin');--> statement-breakpoint
CREATE TABLE "answers" (
	"id" text PRIMARY KEY NOT NULL,
	"question_id" text NOT NULL,
	"author_id" text,
	"author_handle" text NOT NULL,
	"author_role" text DEFAULT '學員' NOT NULL,
	"body" text NOT NULL,
	"votes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"challenge_id" text NOT NULL,
	"submission_sha256" text NOT NULL,
	"correct" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_files" (
	"id" text PRIMARY KEY NOT NULL,
	"challenge_id" text NOT NULL,
	"name" text NOT NULL,
	"object_key" text,
	"size" integer,
	"content_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"challenge_id" text NOT NULL,
	"flag_id" text DEFAULT 'flag' NOT NULL,
	"label" text DEFAULT 'Flag' NOT NULL,
	"sha256" text NOT NULL,
	"points" integer DEFAULT 100 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_hints" (
	"id" text PRIMARY KEY NOT NULL,
	"challenge_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"text" text NOT NULL,
	"cost" integer DEFAULT 10 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" "category" DEFAULT 'misc' NOT NULL,
	"difficulty" "difficulty" DEFAULT 'easy' NOT NULL,
	"kind" "challenge_kind" DEFAULT 'challenge' NOT NULL,
	"blurb" text DEFAULT '' NOT NULL,
	"description" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"author_id" text,
	"tutorial" boolean DEFAULT false NOT NULL,
	"lesson_ref" text,
	"base_solves" integer DEFAULT 0 NOT NULL,
	"rating" real DEFAULT 0 NOT NULL,
	"connection_type" "connection_type" DEFAULT 'none' NOT NULL,
	"connection_value" text,
	"instance_image" text,
	"instance_port" integer,
	"instance_ttl_min" integer DEFAULT 120 NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"released_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"user_id" text NOT NULL,
	"event_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_registrations_user_id_event_id_pk" PRIMARY KEY("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "event_type" DEFAULT 'live' NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_min" integer DEFAULT 90 NOT NULL,
	"mode" "event_mode" DEFAULT 'online' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"host_id" text,
	"capacity" integer DEFAULT 100 NOT NULL,
	"base_registered" integer DEFAULT 0 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hint_unlocks" (
	"user_id" text NOT NULL,
	"hint_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hint_unlocks_user_id_hint_id_pk" PRIMARY KEY("user_id","hint_id")
);
--> statement-breakpoint
CREATE TABLE "instances" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"challenge_id" text NOT NULL,
	"external_id" text,
	"host" text,
	"port" integer,
	"status" "instance_status" DEFAULT 'starting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instructors" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"handle" text NOT NULL,
	"role" text NOT NULL,
	"domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"creds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"accent" text DEFAULT '#a4f13b' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"watched" real DEFAULT 0 NOT NULL,
	"checkpoints_done" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"module_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"duration_sec" integer DEFAULT 600 NOT NULL,
	"xp" integer DEFAULT 60 NOT NULL,
	"video_provider" "video_provider" DEFAULT 'none' NOT NULL,
	"video_id" text,
	"video_status" "video_status" DEFAULT 'none' NOT NULL,
	"thumbnail_url" text,
	"content" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checkpoints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lab_slug" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" "question_scope" NOT NULL,
	"ref_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"author_id" text,
	"author_handle" text NOT NULL,
	"votes" integer DEFAULT 0 NOT NULL,
	"accepted_answer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short" text NOT NULL,
	"region" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "solves" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"challenge_id" text NOT NULL,
	"flag_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"en" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT 'Puzzle' NOT NULL,
	"color" text DEFAULT '#a4f13b' NOT NULL,
	"level" text DEFAULT '入門友善' NOT NULL,
	"difficulty" "difficulty" DEFAULT 'easy' NOT NULL,
	"outcome" text DEFAULT '' NOT NULL,
	"syllabus" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"instructor_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"discord_id" text,
	"handle" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"email" text,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"school_id" text,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	"banned_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "xp_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" "xp_reason" NOT NULL,
	"ref_id" text,
	"label" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_files" ADD CONSTRAINT "challenge_files_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_flags" ADD CONSTRAINT "challenge_flags_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_hints" ADD CONSTRAINT "challenge_hints_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_author_id_instructors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."instructors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_host_id_instructors_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."instructors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hint_unlocks" ADD CONSTRAINT "hint_unlocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hint_unlocks" ADD CONSTRAINT "hint_unlocks_hint_id_challenge_hints_id_fk" FOREIGN KEY ("hint_id") REFERENCES "public"."challenge_hints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instances" ADD CONSTRAINT "instances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instances" ADD CONSTRAINT "instances_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructors" ADD CONSTRAINT "instructors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solves" ADD CONSTRAINT "solves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solves" ADD CONSTRAINT "solves_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_instructor_id_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answers_question_idx" ON "answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "attempts_user_idx" ON "attempts" USING btree ("user_id","challenge_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "challenge_files_idx" ON "challenge_files" USING btree ("challenge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_flags_idx" ON "challenge_flags" USING btree ("challenge_id","flag_id");--> statement-breakpoint
CREATE INDEX "challenge_hints_idx" ON "challenge_hints" USING btree ("challenge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "challenges_slug_idx" ON "challenges" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "challenges_status_idx" ON "challenges" USING btree ("status");--> statement-breakpoint
CREATE INDEX "instances_user_idx" ON "instances" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_track_slug_idx" ON "lessons" USING btree ("track_id","slug");--> statement-breakpoint
CREATE INDEX "lessons_module_idx" ON "lessons" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "modules_track_idx" ON "modules" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "questions_ref_idx" ON "questions" USING btree ("scope","ref_id");--> statement-breakpoint
CREATE UNIQUE INDEX "solves_unique_idx" ON "solves" USING btree ("user_id","challenge_id","flag_id");--> statement-breakpoint
CREATE INDEX "solves_challenge_idx" ON "solves" USING btree ("challenge_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_slug_idx" ON "tracks" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "users_handle_idx" ON "users" USING btree ("handle");--> statement-breakpoint
CREATE UNIQUE INDEX "users_discord_idx" ON "users" USING btree ("discord_id");--> statement-breakpoint
CREATE INDEX "xp_user_idx" ON "xp_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "xp_created_idx" ON "xp_ledger" USING btree ("created_at");