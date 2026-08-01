CREATE TYPE "public"."real_product_basis" AS ENUM('physical_product', 'physical_sample', 'internal_product_code', 'supply_specification', 'explicit_specification_combination');--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "real_product_basis" real_product_basis;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "real_product_evidence_note" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "real_product_confirmed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "real_product_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_real_product_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("real_product_confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;