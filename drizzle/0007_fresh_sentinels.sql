CREATE TABLE `tournament_match` (
	`tournament_id` text NOT NULL,
	`fixture_id` text NOT NULL,
	`match_id` text NOT NULL,
	PRIMARY KEY(`tournament_id`, `fixture_id`),
	FOREIGN KEY (`tournament_id`) REFERENCES `tournament`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`match_id`) REFERENCES `match`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tournament_match_match_idx` ON `tournament_match` (`match_id`);--> statement-breakpoint
CREATE TABLE `tournament_player` (
	`tournament_id` text NOT NULL,
	`player_id` text NOT NULL,
	`seed` integer NOT NULL,
	PRIMARY KEY(`tournament_id`, `player_id`),
	FOREIGN KEY (`tournament_id`) REFERENCES `tournament`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tournament_round_format` (
	`tournament_id` text NOT NULL,
	`phase` text NOT NULL,
	`round` integer NOT NULL,
	`legs_to_win_set` integer NOT NULL,
	`sets_to_win_match` integer NOT NULL,
	PRIMARY KEY(`tournament_id`, `phase`, `round`),
	FOREIGN KEY (`tournament_id`) REFERENCES `tournament`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tournament` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`format` text NOT NULL,
	`group_count` integer DEFAULT 1 NOT NULL,
	`advance_per_group` integer DEFAULT 2 NOT NULL,
	`start_score` integer NOT NULL,
	`in_rule` text NOT NULL,
	`out_rule` text NOT NULL,
	`input_mode` text DEFAULT 'single' NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE set null
);
