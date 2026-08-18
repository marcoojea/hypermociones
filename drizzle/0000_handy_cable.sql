CREATE TABLE `account_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`onboarding_completed` integer DEFAULT false NOT NULL,
	`preferences_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `account_snapshots` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payload_json` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `account_profiles`(`user_id`) ON UPDATE no action ON DELETE cascade
);
