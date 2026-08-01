CREATE TYPE "public"."attribution_confidence" AS ENUM('high', 'medium', 'low', 'unavailable');--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "last_non_direct_source" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "last_non_direct_medium" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "last_non_direct_campaign" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "attribution_confidence" "attribution_confidence" DEFAULT 'unavailable' NOT NULL;