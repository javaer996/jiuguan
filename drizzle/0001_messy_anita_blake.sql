ALTER TABLE `characters` MODIFY COLUMN `description` mediumtext;--> statement-breakpoint
ALTER TABLE `characters` MODIFY COLUMN `personality` mediumtext;--> statement-breakpoint
ALTER TABLE `characters` MODIFY COLUMN `scenario` mediumtext;--> statement-breakpoint
ALTER TABLE `characters` MODIFY COLUMN `first_message` mediumtext;--> statement-breakpoint
ALTER TABLE `characters` MODIFY COLUMN `example_dialogue` mediumtext;--> statement-breakpoint
ALTER TABLE `characters` MODIFY COLUMN `system_prompt` mediumtext;--> statement-breakpoint
ALTER TABLE `characters` MODIFY COLUMN `post_history_instructions` mediumtext;--> statement-breakpoint
ALTER TABLE `characters` MODIFY COLUMN `creator_notes` mediumtext;--> statement-breakpoint
ALTER TABLE `chat_styles` MODIFY COLUMN `description` mediumtext;--> statement-breakpoint
ALTER TABLE `chat_styles` MODIFY COLUMN `custom_css` mediumtext;--> statement-breakpoint
ALTER TABLE `chat_templates` MODIFY COLUMN `description` mediumtext;--> statement-breakpoint
ALTER TABLE `output_schemas` MODIFY COLUMN `description` mediumtext;--> statement-breakpoint
ALTER TABLE `personas` MODIFY COLUMN `description` mediumtext;--> statement-breakpoint
ALTER TABLE `prompt_presets` MODIFY COLUMN `description` mediumtext;--> statement-breakpoint
ALTER TABLE `prompt_presets` MODIFY COLUMN `system_prompt` mediumtext;--> statement-breakpoint
ALTER TABLE `prompt_presets` MODIFY COLUMN `post_history_instructions` mediumtext;--> statement-breakpoint
ALTER TABLE `quick_replies` MODIFY COLUMN `content` mediumtext NOT NULL;--> statement-breakpoint
ALTER TABLE `themes` MODIFY COLUMN `description` mediumtext;--> statement-breakpoint
ALTER TABLE `themes` MODIFY COLUMN `custom_css` mediumtext;--> statement-breakpoint
ALTER TABLE `worldbook_entries` MODIFY COLUMN `content` mediumtext NOT NULL;--> statement-breakpoint
ALTER TABLE `worldbooks` MODIFY COLUMN `description` mediumtext;--> statement-breakpoint
ALTER TABLE `context_compressions` MODIFY COLUMN `summary` mediumtext NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` MODIFY COLUMN `content` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` MODIFY COLUMN `raw_content` longtext;--> statement-breakpoint
ALTER TABLE `session_memories` MODIFY COLUMN `content` mediumtext NOT NULL;