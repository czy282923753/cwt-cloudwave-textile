ALTER TABLE "inquiries" ADD COLUMN "submit_referrer" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "submit_utm_source" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "submit_utm_medium" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "submit_utm_campaign" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "source_entity_type" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "source_entity_id" uuid;--> statement-breakpoint
CREATE INDEX "inquiries_source_entity_idx" ON "inquiries" USING btree ("source_entity_type","source_entity_id");--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_source_entity_pair_check" CHECK ((
        "inquiries"."source_entity_type" is null
        and "inquiries"."source_entity_id" is null
      ) or (
        "inquiries"."source_entity_type" is not null
        and "inquiries"."source_entity_type" in ('product', 'application', 'content')
        and "inquiries"."source_entity_id" is not null
      ));
