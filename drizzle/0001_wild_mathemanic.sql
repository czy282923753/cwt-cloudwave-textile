ALTER TABLE "applications" ADD COLUMN "internal_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "taxonomy_terms" ADD COLUMN "internal_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "internal_key" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_terms_internal_key_unique" ON "taxonomy_terms" USING btree ("internal_key");--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_internal_key_unique" UNIQUE("internal_key");--> statement-breakpoint
ALTER TABLE "authors" ADD CONSTRAINT "authors_internal_key_unique" UNIQUE("internal_key");