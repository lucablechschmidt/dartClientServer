DROP INDEX `player_name_unique`;--> statement-breakpoint
ALTER TABLE `player` ADD `deleted_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `player_name_unique` ON `player` (lower("name")) WHERE "player"."deleted_at" IS NULL;