ALTER TABLE `match` ADD `input_mode` text DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE `match` ADD `host_player_id` text REFERENCES player(id);