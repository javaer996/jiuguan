CREATE TABLE `auth_sessions` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`token_hash` char(64) NOT NULL,
	`user_agent` varchar(512),
	`ip` varchar(64),
	`expires_at` datetime(3) NOT NULL,
	`last_used_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`revoked_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `auth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_sessions_token_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `invite_code_uses` (
	`id` char(36) NOT NULL,
	`invite_code_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`ip` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `invite_code_uses_id` PRIMARY KEY(`id`),
	CONSTRAINT `invite_code_uses_code_user_uq` UNIQUE(`invite_code_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `invite_codes` (
	`id` char(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`created_by` char(36),
	`max_uses` int unsigned NOT NULL DEFAULT 1,
	`used_count` int unsigned NOT NULL DEFAULT 0,
	`expires_at` datetime(3),
	`disabled` boolean NOT NULL DEFAULT false,
	`note` varchar(255),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `invite_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `invite_codes_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`token_hash` char(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_hash_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` char(36) NOT NULL,
	`theme` varchar(16) NOT NULL DEFAULT 'dark',
	`locale` varchar(16) NOT NULL DEFAULT 'zh-CN',
	`default_provider_id` char(36),
	`default_template_id` char(36),
	`default_prompt_preset_id` char(36),
	`default_chat_style_id` char(36),
	`default_output_schema_id` char(36),
	`default_persona_id` char(36),
	`preferences` json,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_settings_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(36) NOT NULL,
	`username` varchar(32) NOT NULL,
	`email` varchar(255),
	`password_hash` varchar(100) NOT NULL,
	`display_name` varchar(48) NOT NULL,
	`avatar_url` varchar(512),
	`bio` varchar(280),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`status` enum('active','suspended','deleted') NOT NULL DEFAULT 'active',
	`last_login_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_uq` UNIQUE(`username`),
	CONSTRAINT `users_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `api_provider_grants` (
	`id` char(36) NOT NULL,
	`provider_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`granted_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `api_provider_grants_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_provider_grants_provider_user_uq` UNIQUE(`provider_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `api_providers` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`name` varchar(64) NOT NULL,
	`base_url` varchar(512) NOT NULL,
	`api_key_enc` text NOT NULL,
	`api_key_hint` varchar(16),
	`model` varchar(128) NOT NULL,
	`models` json,
	`temperature` float NOT NULL DEFAULT 0.85,
	`top_p` float NOT NULL DEFAULT 1,
	`max_tokens` int unsigned NOT NULL DEFAULT 2048,
	`presence_penalty` float NOT NULL DEFAULT 0,
	`frequency_penalty` float NOT NULL DEFAULT 0,
	`context_window` int unsigned NOT NULL DEFAULT 8192,
	`capabilities` json,
	`extra_headers` json,
	`is_shared` boolean NOT NULL DEFAULT false,
	`is_default` boolean NOT NULL DEFAULT false,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`last_checked_at` datetime(3),
	`last_check_status` varchar(16),
	`last_check_message` varchar(512),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `api_providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `character_personas` (
	`id` char(36) NOT NULL,
	`character_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`persona_id` char(36) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `character_personas_id` PRIMARY KEY(`id`),
	CONSTRAINT `character_personas_character_user_uq` UNIQUE(`character_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`name` varchar(64) NOT NULL,
	`avatar_url` varchar(512),
	`tagline` varchar(160),
	`description` text,
	`personality` text,
	`scenario` text,
	`first_message` text,
	`alternate_greetings` json,
	`example_dialogue` text,
	`system_prompt` text,
	`post_history_instructions` text,
	`creator_notes` text,
	`tags` json,
	`extensions` json,
	`source` enum('manual','ai','import') NOT NULL DEFAULT 'manual',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `characters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_styles` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` text,
	`built_in_key` varchar(32),
	`config` json,
	`custom_css` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `chat_styles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_templates` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` text,
	`cover_url` varchar(1024),
	`character_id` char(36),
	`worldbook_ids` json,
	`prompt_preset_id` char(36),
	`chat_style_id` char(36),
	`theme_id` char(36),
	`output_schema_id` char(36),
	`persona_id` char(36),
	`provider_id` char(36),
	`settings` json,
	`greeting_index` int unsigned NOT NULL DEFAULT 0,
	`usage_count` int unsigned NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `chat_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`kind` enum('avatar','background','image','attachment') NOT NULL DEFAULT 'image',
	`url` varchar(1024) NOT NULL,
	`mime_type` varchar(64) NOT NULL,
	`size` int unsigned NOT NULL DEFAULT 0,
	`width` int unsigned,
	`height` int unsigned,
	`original_name` varchar(255),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `media_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `output_schemas` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` text,
	`schema` json NOT NULL,
	`sample` json,
	`mode` enum('json_object','json_schema','text') NOT NULL DEFAULT 'json_object',
	`strict` boolean NOT NULL DEFAULT false,
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `output_schemas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `personas` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`name` varchar(48) NOT NULL,
	`avatar_url` varchar(512),
	`description` text,
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `personas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prompt_presets` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` text,
	`system_prompt` text,
	`post_history_instructions` text,
	`blocks` json,
	`variables` json,
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `prompt_presets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quick_replies` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`name` varchar(64) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(32),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `quick_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `themes` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` text,
	`tokens` json,
	`custom_css` text,
	`background_url` varchar(1024),
	`mode` enum('dark','light','both') NOT NULL DEFAULT 'both',
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `themes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `worldbook_entries` (
	`id` char(36) NOT NULL,
	`worldbook_id` char(36) NOT NULL,
	`uid` varchar(64),
	`name` varchar(128) NOT NULL,
	`keys` json,
	`secondary_keys` json,
	`content` text NOT NULL,
	`constant` boolean NOT NULL DEFAULT false,
	`selective` boolean NOT NULL DEFAULT true,
	`selective_logic` varchar(32) NOT NULL DEFAULT 'and_any',
	`position` varchar(32) NOT NULL DEFAULT 'before_char',
	`depth` int unsigned NOT NULL DEFAULT 4,
	`sort_order` int NOT NULL DEFAULT 100,
	`probability` int unsigned NOT NULL DEFAULT 100,
	`use_probability` boolean NOT NULL DEFAULT true,
	`enabled` boolean NOT NULL DEFAULT true,
	`case_sensitive` boolean NOT NULL DEFAULT false,
	`match_whole_words` boolean NOT NULL DEFAULT false,
	`group_name` varchar(64),
	`group_weight` int NOT NULL DEFAULT 100,
	`exclude_recursion` boolean NOT NULL DEFAULT false,
	`prevent_recursion` boolean NOT NULL DEFAULT false,
	`delay_until_recursion` boolean NOT NULL DEFAULT false,
	`scan_depth` int unsigned,
	`token_budget` int unsigned,
	`extensions` json,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `worldbook_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `worldbooks` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` text,
	`scan_depth` int unsigned NOT NULL DEFAULT 4,
	`token_budget` int unsigned NOT NULL DEFAULT 2048,
	`recursive` boolean NOT NULL DEFAULT false,
	`max_recursion_depth` int unsigned NOT NULL DEFAULT 2,
	`case_sensitive` boolean NOT NULL DEFAULT false,
	`match_whole_words` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `worldbooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`title` varchar(160) NOT NULL DEFAULT '新的对话',
	`character_id` char(36),
	`template_id` char(36),
	`provider_id` char(36),
	`chat_style_id` char(36),
	`prompt_preset_id` char(36),
	`persona_id` char(36),
	`output_schema_id` char(36),
	`worldbook_ids` json,
	`model` varchar(128),
	`settings` json,
	`active_leaf_id` char(36),
	`last_message_at` datetime(3),
	`message_count` int unsigned NOT NULL DEFAULT 0,
	`pinned` boolean NOT NULL DEFAULT false,
	`archived` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `chat_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `context_compressions` (
	`id` char(36) NOT NULL,
	`session_id` char(36) NOT NULL,
	`branch_leaf_id` char(36) NOT NULL,
	`from_message_id` char(36),
	`to_message_id` char(36),
	`summary` text NOT NULL,
	`tokens_before` int unsigned,
	`tokens_after` int unsigned,
	`message_count` int unsigned,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `context_compressions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` char(36) NOT NULL,
	`session_id` char(36) NOT NULL,
	`parent_id` char(36),
	`active_child_id` char(36),
	`role` enum('system','user','assistant','note') NOT NULL DEFAULT 'assistant',
	`content` text NOT NULL,
	`raw_content` text,
	`structured` json,
	`metadata` json,
	`status` enum('pending','streaming','complete','error','cancelled') NOT NULL DEFAULT 'complete',
	`tokens_in` int unsigned,
	`tokens_out` int unsigned,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_memories` (
	`id` char(36) NOT NULL,
	`session_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`kind` enum('permanent','hidden','summary','note') NOT NULL DEFAULT 'note',
	`title` varchar(160),
	`content` text NOT NULL,
	`importance` int unsigned NOT NULL DEFAULT 1,
	`enabled` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `session_memories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`target_type` enum('template','character','worldbook','prompt_preset','chat_style','theme','output_schema','session') NOT NULL,
	`target_id` char(36) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `favorites_user_target_uq` UNIQUE(`user_id`,`target_type`,`target_id`)
);
--> statement-breakpoint
CREATE TABLE `plaza_categories` (
	`id` char(36) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(64) NOT NULL,
	`description` varchar(255),
	`icon` varchar(64),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `plaza_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `plaza_categories_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `plaza_reviews` (
	`id` char(36) NOT NULL,
	`template_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`rating` tinyint unsigned NOT NULL,
	`content` text,
	`status` enum('visible','hidden') NOT NULL DEFAULT 'visible',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `plaza_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `plaza_reviews_template_user_uq` UNIQUE(`template_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `plaza_template_tags` (
	`template_id` char(36) NOT NULL,
	`tag_id` char(36) NOT NULL,
	CONSTRAINT `plaza_template_tags_pk` PRIMARY KEY(`template_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `plaza_template_versions` (
	`id` char(36) NOT NULL,
	`template_id` char(36) NOT NULL,
	`version` int unsigned NOT NULL,
	`snapshot` json NOT NULL,
	`changelog` varchar(500),
	`created_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `plaza_template_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `plaza_template_versions_template_version_uq` UNIQUE(`template_id`,`version`)
);
--> statement-breakpoint
CREATE TABLE `plaza_templates` (
	`id` char(36) NOT NULL,
	`author_id` char(36) NOT NULL,
	`category_id` char(36),
	`title` varchar(80) NOT NULL,
	`summary` varchar(500),
	`cover_url` varchar(1024),
	`status` enum('draft','pending','published','rejected','archived') NOT NULL DEFAULT 'draft',
	`featured` boolean NOT NULL DEFAULT false,
	`is_official` boolean NOT NULL DEFAULT false,
	`reject_reason` text,
	`published_version_id` char(36),
	`submitted_at` datetime(3),
	`reviewed_at` datetime(3),
	`reviewed_by` char(36),
	`clone_count` int unsigned NOT NULL DEFAULT 0,
	`like_count` int unsigned NOT NULL DEFAULT 0,
	`view_count` int unsigned NOT NULL DEFAULT 0,
	`rating_avg` float NOT NULL DEFAULT 0,
	`rating_count` int unsigned NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `plaza_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` char(36) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(32) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `template_clones` (
	`id` char(36) NOT NULL,
	`template_id` char(36) NOT NULL,
	`version_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`session_id` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `template_clones_id` PRIMARY KEY(`id`),
	CONSTRAINT `template_clones_template_user_uq` UNIQUE(`template_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `template_daily_stats` (
	`id` char(36) NOT NULL,
	`template_id` char(36) NOT NULL,
	`day` date NOT NULL,
	`views` int unsigned NOT NULL DEFAULT 0,
	`clones` int unsigned NOT NULL DEFAULT 0,
	`likes` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `template_daily_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `template_daily_stats_template_day_uq` UNIQUE(`template_id`,`day`)
);
--> statement-breakpoint
CREATE TABLE `template_events` (
	`id` char(36) NOT NULL,
	`template_id` char(36) NOT NULL,
	`user_id` char(36),
	`type` enum('view','clone','like','unlike','favorite','share') NOT NULL,
	`ip` varchar(64),
	`user_agent` varchar(512),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `template_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_likes` (
	`id` char(36) NOT NULL,
	`template_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `template_likes_id` PRIMARY KEY(`id`),
	CONSTRAINT `template_likes_template_user_uq` UNIQUE(`template_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` char(36) NOT NULL,
	`actor_id` char(36),
	`action` varchar(64) NOT NULL,
	`target_type` varchar(32),
	`target_id` char(36),
	`detail` json,
	`ip` varchar(64),
	`user_agent` varchar(512),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` varchar(64) NOT NULL,
	`value` json,
	`updated_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `system_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `usage_logs` (
	`id` char(36) NOT NULL,
	`user_id` char(36),
	`provider_id` char(36),
	`session_id` char(36),
	`message_id` char(36),
	`kind` enum('chat','assist','title','summary','memory','embedding') NOT NULL DEFAULT 'chat',
	`model` varchar(128),
	`prompt_tokens` int unsigned,
	`completion_tokens` int unsigned,
	`total_tokens` int unsigned,
	`latency_ms` int unsigned,
	`status` enum('success','error','cancelled') NOT NULL DEFAULT 'success',
	`error_code` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `usage_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invite_code_uses` ADD CONSTRAINT `invite_code_uses_invite_code_id_invite_codes_id_fk` FOREIGN KEY (`invite_code_id`) REFERENCES `invite_codes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invite_code_uses` ADD CONSTRAINT `invite_code_uses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invite_codes` ADD CONSTRAINT `invite_codes_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_settings` ADD CONSTRAINT `user_settings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_provider_grants` ADD CONSTRAINT `api_provider_grants_provider_id_api_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `api_providers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_provider_grants` ADD CONSTRAINT `api_provider_grants_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_provider_grants` ADD CONSTRAINT `api_provider_grants_granted_by_users_id_fk` FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_providers` ADD CONSTRAINT `api_providers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `character_personas` ADD CONSTRAINT `character_personas_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `character_personas` ADD CONSTRAINT `character_personas_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `characters` ADD CONSTRAINT `characters_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_styles` ADD CONSTRAINT `chat_styles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_templates` ADD CONSTRAINT `chat_templates_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_templates` ADD CONSTRAINT `chat_templates_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_templates` ADD CONSTRAINT `chat_templates_prompt_preset_id_prompt_presets_id_fk` FOREIGN KEY (`prompt_preset_id`) REFERENCES `prompt_presets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_templates` ADD CONSTRAINT `chat_templates_chat_style_id_chat_styles_id_fk` FOREIGN KEY (`chat_style_id`) REFERENCES `chat_styles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_templates` ADD CONSTRAINT `chat_templates_theme_id_themes_id_fk` FOREIGN KEY (`theme_id`) REFERENCES `themes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_templates` ADD CONSTRAINT `chat_templates_output_schema_id_output_schemas_id_fk` FOREIGN KEY (`output_schema_id`) REFERENCES `output_schemas`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_templates` ADD CONSTRAINT `chat_templates_persona_id_personas_id_fk` FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_templates` ADD CONSTRAINT `chat_templates_provider_id_api_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `api_providers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_assets` ADD CONSTRAINT `media_assets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `output_schemas` ADD CONSTRAINT `output_schemas_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `personas` ADD CONSTRAINT `personas_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prompt_presets` ADD CONSTRAINT `prompt_presets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quick_replies` ADD CONSTRAINT `quick_replies_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `themes` ADD CONSTRAINT `themes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `worldbook_entries` ADD CONSTRAINT `worldbook_entries_worldbook_id_worldbooks_id_fk` FOREIGN KEY (`worldbook_id`) REFERENCES `worldbooks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `worldbooks` ADD CONSTRAINT `worldbooks_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_template_id_chat_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `chat_templates`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_provider_id_api_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `api_providers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_chat_style_id_chat_styles_id_fk` FOREIGN KEY (`chat_style_id`) REFERENCES `chat_styles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_prompt_preset_id_prompt_presets_id_fk` FOREIGN KEY (`prompt_preset_id`) REFERENCES `prompt_presets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_persona_id_personas_id_fk` FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_output_schema_id_output_schemas_id_fk` FOREIGN KEY (`output_schema_id`) REFERENCES `output_schemas`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `context_compressions` ADD CONSTRAINT `context_compressions_session_id_chat_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_session_id_chat_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_memories` ADD CONSTRAINT `session_memories_session_id_chat_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_memories` ADD CONSTRAINT `session_memories_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plaza_reviews` ADD CONSTRAINT `plaza_reviews_template_id_plaza_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `plaza_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plaza_reviews` ADD CONSTRAINT `plaza_reviews_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plaza_template_tags` ADD CONSTRAINT `plaza_template_tags_template_id_plaza_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `plaza_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plaza_template_tags` ADD CONSTRAINT `plaza_template_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plaza_template_versions` ADD CONSTRAINT `plaza_template_versions_template_id_plaza_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `plaza_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plaza_template_versions` ADD CONSTRAINT `plaza_template_versions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plaza_templates` ADD CONSTRAINT `plaza_templates_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plaza_templates` ADD CONSTRAINT `plaza_templates_category_id_plaza_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `plaza_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plaza_templates` ADD CONSTRAINT `plaza_templates_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_clones` ADD CONSTRAINT `template_clones_template_id_plaza_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `plaza_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_clones` ADD CONSTRAINT `template_clones_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_daily_stats` ADD CONSTRAINT `template_daily_stats_template_id_plaza_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `plaza_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_events` ADD CONSTRAINT `template_events_template_id_plaza_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `plaza_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_events` ADD CONSTRAINT `template_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_likes` ADD CONSTRAINT `template_likes_template_id_plaza_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `plaza_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_likes` ADD CONSTRAINT `template_likes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `system_settings` ADD CONSTRAINT `system_settings_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usage_logs` ADD CONSTRAINT `usage_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usage_logs` ADD CONSTRAINT `usage_logs_provider_id_api_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `api_providers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usage_logs` ADD CONSTRAINT `usage_logs_session_id_chat_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_expires_idx` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `invite_code_uses_user_idx` ON `invite_code_uses` (`user_id`);--> statement-breakpoint
CREATE INDEX `invite_codes_created_by_idx` ON `invite_codes` (`created_by`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_user_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `api_provider_grants_user_idx` ON `api_provider_grants` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_providers_user_idx` ON `api_providers` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_providers_shared_idx` ON `api_providers` (`is_shared`,`status`);--> statement-breakpoint
CREATE INDEX `character_personas_persona_idx` ON `character_personas` (`persona_id`);--> statement-breakpoint
CREATE INDEX `characters_user_idx` ON `characters` (`user_id`);--> statement-breakpoint
CREATE INDEX `characters_user_name_idx` ON `characters` (`user_id`,`name`);--> statement-breakpoint
CREATE INDEX `chat_styles_user_idx` ON `chat_styles` (`user_id`);--> statement-breakpoint
CREATE INDEX `chat_templates_user_idx` ON `chat_templates` (`user_id`);--> statement-breakpoint
CREATE INDEX `chat_templates_user_updated_idx` ON `chat_templates` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `media_assets_user_idx` ON `media_assets` (`user_id`);--> statement-breakpoint
CREATE INDEX `media_assets_kind_idx` ON `media_assets` (`kind`);--> statement-breakpoint
CREATE INDEX `output_schemas_user_idx` ON `output_schemas` (`user_id`);--> statement-breakpoint
CREATE INDEX `personas_user_idx` ON `personas` (`user_id`);--> statement-breakpoint
CREATE INDEX `prompt_presets_user_idx` ON `prompt_presets` (`user_id`);--> statement-breakpoint
CREATE INDEX `quick_replies_user_idx` ON `quick_replies` (`user_id`);--> statement-breakpoint
CREATE INDEX `themes_user_idx` ON `themes` (`user_id`);--> statement-breakpoint
CREATE INDEX `worldbook_entries_book_idx` ON `worldbook_entries` (`worldbook_id`);--> statement-breakpoint
CREATE INDEX `worldbook_entries_book_enabled_idx` ON `worldbook_entries` (`worldbook_id`,`enabled`);--> statement-breakpoint
CREATE INDEX `worldbooks_user_idx` ON `worldbooks` (`user_id`);--> statement-breakpoint
CREATE INDEX `chat_sessions_user_recent_idx` ON `chat_sessions` (`user_id`,`last_message_at`);--> statement-breakpoint
CREATE INDEX `chat_sessions_user_archived_idx` ON `chat_sessions` (`user_id`,`archived`);--> statement-breakpoint
CREATE INDEX `chat_sessions_template_idx` ON `chat_sessions` (`template_id`);--> statement-breakpoint
CREATE INDEX `context_compressions_session_idx` ON `context_compressions` (`session_id`);--> statement-breakpoint
CREATE INDEX `context_compressions_leaf_idx` ON `context_compressions` (`session_id`,`branch_leaf_id`);--> statement-breakpoint
CREATE INDEX `messages_session_created_idx` ON `messages` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `messages_parent_idx` ON `messages` (`parent_id`);--> statement-breakpoint
CREATE INDEX `messages_session_status_idx` ON `messages` (`session_id`,`status`);--> statement-breakpoint
CREATE INDEX `session_memories_session_idx` ON `session_memories` (`session_id`);--> statement-breakpoint
CREATE INDEX `session_memories_user_idx` ON `session_memories` (`user_id`);--> statement-breakpoint
CREATE INDEX `favorites_target_idx` ON `favorites` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `plaza_reviews_template_idx` ON `plaza_reviews` (`template_id`,`status`);--> statement-breakpoint
CREATE INDEX `plaza_template_tags_tag_idx` ON `plaza_template_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `plaza_templates_status_idx` ON `plaza_templates` (`status`,`featured`);--> statement-breakpoint
CREATE INDEX `plaza_templates_category_idx` ON `plaza_templates` (`category_id`,`status`);--> statement-breakpoint
CREATE INDEX `plaza_templates_author_idx` ON `plaza_templates` (`author_id`);--> statement-breakpoint
CREATE INDEX `plaza_templates_clone_idx` ON `plaza_templates` (`clone_count`);--> statement-breakpoint
CREATE INDEX `plaza_templates_rating_idx` ON `plaza_templates` (`rating_avg`);--> statement-breakpoint
CREATE INDEX `template_clones_user_idx` ON `template_clones` (`user_id`);--> statement-breakpoint
CREATE INDEX `template_events_template_created_idx` ON `template_events` (`template_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `template_events_template_type_idx` ON `template_events` (`template_id`,`type`);--> statement-breakpoint
CREATE INDEX `template_events_user_idx` ON `template_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `template_likes_user_idx` ON `template_likes` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_created_idx` ON `audit_logs` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_created_idx` ON `audit_logs` (`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `usage_logs_user_created_idx` ON `usage_logs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `usage_logs_provider_created_idx` ON `usage_logs` (`provider_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `usage_logs_session_idx` ON `usage_logs` (`session_id`);