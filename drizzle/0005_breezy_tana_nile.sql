CREATE TYPE "public"."allocation_method" AS ENUM('value', 'weight', 'manual');--> statement-breakpoint
CREATE TYPE "public"."batch_status" AS ENUM('draft', 'completed');--> statement-breakpoint
CREATE TABLE "production_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"batch_number" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"production_date" date NOT NULL,
	"added_cost_minor" bigint NOT NULL,
	"allocation_method" "allocation_method" DEFAULT 'value' NOT NULL,
	"notes" text,
	"status" "batch_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "production_input" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text,
	"quantity" numeric(14, 3) NOT NULL,
	"unit_cost_minor" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_output" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"product_id" text,
	"variant_id" text,
	"quantity" numeric(14, 3) NOT NULL,
	"allocated_cost_minor" bigint NOT NULL,
	"is_waste" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "production_batch" ADD CONSTRAINT "production_batch_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batch" ADD CONSTRAINT "production_batch_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batch" ADD CONSTRAINT "production_batch_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_input" ADD CONSTRAINT "production_input_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_input" ADD CONSTRAINT "production_input_batch_id_production_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."production_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_input" ADD CONSTRAINT "production_input_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_input" ADD CONSTRAINT "production_input_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_output" ADD CONSTRAINT "production_output_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_output" ADD CONSTRAINT "production_output_batch_id_production_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."production_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_output" ADD CONSTRAINT "production_output_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_output" ADD CONSTRAINT "production_output_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE no action ON UPDATE no action;