CREATE TYPE "public"."customer_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."supplier_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."supplier_type" AS ENUM('farmer', 'supplier', 'trader');--> statement-breakpoint
CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"business_name" text,
	"phone" text NOT NULL,
	"whatsapp" text,
	"city" text,
	"address" text,
	"credit_limit_minor" bigint DEFAULT 0 NOT NULL,
	"payment_terms" text,
	"notes" text,
	"status" "customer_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "customer_contact" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"phone" text,
	"email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "customer_delivery_address" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"label" text NOT NULL,
	"address" text NOT NULL,
	"city" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "supplier" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"type" "supplier_type" NOT NULL,
	"name" text NOT NULL,
	"business_name" text,
	"phone" text,
	"whatsapp" text,
	"address" text,
	"payment_terms" text,
	"notes" text,
	"status" "supplier_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" text
);
--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contact" ADD CONSTRAINT "customer_contact_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contact" ADD CONSTRAINT "customer_contact_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_delivery_address" ADD CONSTRAINT "customer_delivery_address_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_delivery_address" ADD CONSTRAINT "customer_delivery_address_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;