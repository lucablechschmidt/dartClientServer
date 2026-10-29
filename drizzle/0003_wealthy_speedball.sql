CREATE TABLE `invite` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`player_id` text,
	`reset_sessions` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_player_idx` ON `session` (`player_id`);--> statement-breakpoint
ALTER TABLE `player` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `player` ADD `is_admin` integer DEFAULT false NOT NULL;