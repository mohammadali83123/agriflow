CREATE TYPE "public"."dispatch_method" AS ENUM('company_transport', 'customer_pickup');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'confirmed', 'reserved', 'ready', 'dispatched', 'delivered', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "dispatch" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"order_id" text NOT NULL,
	"method" "dispatch_method" NOT NULL,
	"vehicle" text,
	"driver" text,
	"dispatch_date" date NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "dispatch_line" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"dispatch_id" text NOT NULL,
	"order_line_id" text NOT NULL,
	"quantity" numeric(14, 3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" text NOT NULL,
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"delivery_address_id" text,
	"notes" text,
	"credit_override" boolean DEFAULT false NOT NULL,
	"confirmed_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "order_line" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text,
	"warehouse_id" text NOT NULL,
	"packaging_option_id" text,
	"qty_ordered" numeric(14, 3) NOT NULL,
	"qty_dispatched" numeric(14, 3) DEFAULT '0' NOT NULL,
	"qty_delivered" numeric(14, 3) DEFAULT '0' NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"below_min_override" boolean DEFAULT false NOT NULL,
	"line_total_minor" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dispatch" ADD CONSTRAINT "dispatch_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch" ADD CONSTRAINT "dispatch_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch" ADD CONSTRAINT "dispatch_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch_line" ADD CONSTRAINT "dispatch_line_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch_line" ADD CONSTRAINT "dispatch_line_dispatch_id_dispatch_id_fk" FOREIGN KEY ("dispatch_id") REFERENCES "public"."dispatch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch_line" ADD CONSTRAINT "dispatch_line_order_line_id_order_line_id_fk" FOREIGN KEY ("order_line_id") REFERENCES "public"."order_line"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_delivery_address_id_customer_delivery_address_id_fk" FOREIGN KEY ("delivery_address_id") REFERENCES "public"."customer_delivery_address"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE no action ON UPDATE no action;