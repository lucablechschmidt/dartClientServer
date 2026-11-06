CREATE TABLE `player_achievement` (
	`player_id` text NOT NULL,
	`key` text NOT NULL,
	`earned_at` integer NOT NULL,
	PRIMARY KEY(`player_id`, `key`),
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE cascade
);
