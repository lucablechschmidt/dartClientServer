CREATE TABLE `player_field_hits` (
	`player_id` text NOT NULL,
	`field` integer NOT NULL,
	`hits` integer NOT NULL,
	PRIMARY KEY(`player_id`, `field`),
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `player` ADD `guest_until` integer;