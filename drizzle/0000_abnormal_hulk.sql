CREATE TABLE `leg` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`set_no` integer DEFAULT 1 NOT NULL,
	`leg_no` integer DEFAULT 1 NOT NULL,
	`starter_player_id` text NOT NULL,
	`winner_player_id` text,
	`finished_at` integer,
	FOREIGN KEY (`match_id`) REFERENCES `match`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`starter_player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`winner_player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `leg_match_idx` ON `leg` (`match_id`);--> statement-breakpoint
CREATE TABLE `match_player` (
	`match_id` text NOT NULL,
	`player_id` text NOT NULL,
	`seat` integer NOT NULL,
	`placement` integer,
	PRIMARY KEY(`match_id`, `player_id`),
	FOREIGN KEY (`match_id`) REFERENCES `match`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `match` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`start_score` integer NOT NULL,
	`in_rule` text NOT NULL,
	`out_rule` text NOT NULL,
	`legs_to_win_set` integer DEFAULT 1 NOT NULL,
	`sets_to_win_match` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`is_tournament` integer DEFAULT false NOT NULL,
	`created_by` text,
	`started_at` integer NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE TABLE `player` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visit` (
	`id` text PRIMARY KEY NOT NULL,
	`leg_id` text NOT NULL,
	`player_id` text NOT NULL,
	`seq` integer NOT NULL,
	`d1_field` integer,
	`d1_type` text,
	`d2_field` integer,
	`d2_type` text,
	`d3_field` integer,
	`d3_type` text,
	`is_bust` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`leg_id`) REFERENCES `leg`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `visit_leg_seq_idx` ON `visit` (`leg_id`,`seq`);