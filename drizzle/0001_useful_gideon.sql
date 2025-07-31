CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`business_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`action` varchar(100) NOT NULL,
	`module` varchar(50) NOT NULL,
	`entity_id` varchar(36),
	`entity_type` varchar(50),
	`details` text,
	`ip_address` varchar(45),
	`user_agent` varchar(500),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_executions` (
	`id` varchar(36) NOT NULL,
	`automation_id` varchar(36) NOT NULL,
	`invoice_id` varchar(36),
	`executed_at` datetime NOT NULL,
	`status` enum('executed','sent','completed','error') NOT NULL,
	`error_message` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automation_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_lines` (
	`id` varchar(36) NOT NULL,
	`automation_id` varchar(36) NOT NULL,
	`description` varchar(255) NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`unit_price` decimal(10,2) NOT NULL,
	`tax_rate` decimal(5,2) NOT NULL,
	`total` decimal(10,2) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automation_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `banks` (
	`id` varchar(36) NOT NULL,
	`business_id` varchar(36) NOT NULL,
	`bank_name` varchar(255) NOT NULL,
	`account_holder` varchar(255) NOT NULL,
	`account_type` varchar(100) NOT NULL,
	`nif` varchar(20) NOT NULL,
	`account_number` varchar(50) NOT NULL,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `banks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoice_automations` (
	`id` varchar(36) NOT NULL,
	`business_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`project_id` varchar(36),
	`amount` decimal(12,2) NOT NULL,
	`concept` varchar(255) NOT NULL,
	`frequency` enum('day','month','year') NOT NULL,
	`interval` int NOT NULL DEFAULT 1,
	`start_date` date NOT NULL,
	`time_of_day` time NOT NULL,
	`max_occurrences` int,
	`occurrences` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`last_run_at` datetime,
	`payment_method` enum('bank','bizum','cash'),
	`bank_id` varchar(36),
	`bizum_holder` varchar(255),
	`bizum_number` varchar(20),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `invoice_automations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`business_id` varchar(36),
	`type` enum('info','success','warning','error','update','action') NOT NULL DEFAULT 'info',
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`is_read` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`action_url` varchar(500),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` varchar(36) NOT NULL,
	`business_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nif` varchar(20) NOT NULL,
	`address` varchar(500) NOT NULL,
	`postal_code` varchar(10),
	`city` varchar(100),
	`country` varchar(100) DEFAULT 'España',
	`phone` varchar(20),
	`email` varchar(255),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `received_invoice_lines` (
	`id` varchar(36) NOT NULL,
	`received_invoice_id` varchar(36) NOT NULL,
	`description` text NOT NULL,
	`quantity` int NOT NULL,
	`unit_price` decimal(10,2) NOT NULL,
	`tax_rate` decimal(5,2) NOT NULL,
	`total` decimal(10,2) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `received_invoice_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_module_exclusions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`business_id` varchar(36) NOT NULL,
	`module` varchar(50) NOT NULL,
	`entity_id` varchar(36) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_module_exclusions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_module_exclusions_user_id_business_id_module_entity_id_unique` UNIQUE(`user_id`,`business_id`,`module`,`entity_id`)
);
--> statement-breakpoint
CREATE TABLE `user_permissions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`business_id` varchar(36) NOT NULL,
	`module` varchar(50) NOT NULL,
	`can_view` boolean NOT NULL DEFAULT false,
	`can_create` boolean NOT NULL DEFAULT false,
	`can_edit` boolean NOT NULL DEFAULT false,
	`can_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `user_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_permissions_user_id_business_id_module_unique` UNIQUE(`user_id`,`business_id`,`module`)
);
--> statement-breakpoint
CREATE TABLE `verifactu_config` (
	`id` varchar(36) NOT NULL,
	`business_id` varchar(36) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`mode` enum('verifactu','requerimiento') NOT NULL DEFAULT 'verifactu',
	`certificate_path` varchar(500),
	`certificate_password` varchar(255),
	`environment` enum('production','testing') NOT NULL DEFAULT 'testing',
	`last_sequence_number` int NOT NULL DEFAULT 0,
	`flow_control_seconds` int NOT NULL DEFAULT 60,
	`max_records_per_submission` int NOT NULL DEFAULT 100,
	`auto_submit` boolean NOT NULL DEFAULT true,
	`include_in_pdf` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verifactu_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `verifactu_config_business_id_unique` UNIQUE(`business_id`)
);
--> statement-breakpoint
CREATE TABLE `verifactu_events` (
	`id` varchar(36) NOT NULL,
	`registry_id` varchar(36) NOT NULL,
	`event_type` varchar(50) NOT NULL,
	`event_data` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `verifactu_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verifactu_registry` (
	`id` varchar(36) NOT NULL,
	`business_id` varchar(36) NOT NULL,
	`invoice_id` varchar(36) NOT NULL,
	`invoice_type` enum('sent','received') NOT NULL,
	`sequence_number` int NOT NULL,
	`previous_hash` varchar(128),
	`current_hash` varchar(128) NOT NULL,
	`qr_code` text NOT NULL,
	`qr_url` varchar(500) NOT NULL,
	`xml_content` text NOT NULL,
	`signed_xml` text,
	`transmission_status` enum('pending','sending','sent','error','rejected') NOT NULL DEFAULT 'pending',
	`transmission_date` datetime,
	`aeat_response` text,
	`aeat_csv` varchar(50),
	`error_message` text,
	`retry_count` int DEFAULT 0,
	`next_retry_at` datetime,
	`is_verifiable` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verifactu_registry_id` PRIMARY KEY(`id`),
	CONSTRAINT `verifactu_registry_business_id_sequence_number_unique` UNIQUE(`business_id`,`sequence_number`)
);
--> statement-breakpoint
ALTER TABLE `business_users` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `business_users` MODIFY COLUMN `user_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `business_users` MODIFY COLUMN `business_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `businesses` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` MODIFY COLUMN `business_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `invoice_lines` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `invoice_lines` MODIFY COLUMN `invoice_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `invoice_types` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `invoice_types` MODIFY COLUMN `business_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `business_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `client_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `invoice_type_id` varchar(36);--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `business_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `client_id` varchar(36);--> statement-breakpoint
ALTER TABLE `received_invoice_types` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `received_invoice_types` MODIFY COLUMN `business_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `received_invoices` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `received_invoices` MODIFY COLUMN `business_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `received_invoices` MODIFY COLUMN `received_invoice_type_id` varchar(36);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `businesses` ADD `owner_id` varchar(36);--> statement-breakpoint
ALTER TABLE `invoices` ADD `project_id` varchar(36);--> statement-breakpoint
ALTER TABLE `invoices` ADD `payment_method` enum('bank','bizum','cash');--> statement-breakpoint
ALTER TABLE `invoices` ADD `bank_id` varchar(36);--> statement-breakpoint
ALTER TABLE `invoices` ADD `bizum_holder` varchar(255);--> statement-breakpoint
ALTER TABLE `invoices` ADD `bizum_number` varchar(20);--> statement-breakpoint
ALTER TABLE `received_invoices` ADD `provider_id` varchar(36);--> statement-breakpoint
ALTER TABLE `received_invoices` ADD `project_id` varchar(36);--> statement-breakpoint
ALTER TABLE `received_invoices` ADD `payment_method` enum('bank','bizum','cash');--> statement-breakpoint
ALTER TABLE `received_invoices` ADD `bank_id` varchar(36);--> statement-breakpoint
ALTER TABLE `received_invoices` ADD `bizum_holder` varchar(255);--> statement-breakpoint
ALTER TABLE `received_invoices` ADD `bizum_number` varchar(20);--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_business_id_businesses_id_fk` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `automation_lines` ADD CONSTRAINT `automation_lines_automation_id_invoice_automations_id_fk` FOREIGN KEY (`automation_id`) REFERENCES `invoice_automations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `banks` ADD CONSTRAINT `banks_business_id_businesses_id_fk` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_automations` ADD CONSTRAINT `invoice_automations_business_id_businesses_id_fk` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_automations` ADD CONSTRAINT `invoice_automations_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_automations` ADD CONSTRAINT `invoice_automations_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_automations` ADD CONSTRAINT `invoice_automations_bank_id_banks_id_fk` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `providers` ADD CONSTRAINT `providers_business_id_businesses_id_fk` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `received_invoice_lines` ADD CONSTRAINT `received_invoice_lines_received_invoice_id_received_invoices_id_fk` FOREIGN KEY (`received_invoice_id`) REFERENCES `received_invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_module_exclusions` ADD CONSTRAINT `user_module_exclusions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_module_exclusions` ADD CONSTRAINT `user_module_exclusions_business_id_businesses_id_fk` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_business_id_businesses_id_fk` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verifactu_config` ADD CONSTRAINT `verifactu_config_business_id_businesses_id_fk` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verifactu_events` ADD CONSTRAINT `verifactu_events_registry_id_verifactu_registry_id_fk` FOREIGN KEY (`registry_id`) REFERENCES `verifactu_registry`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verifactu_registry` ADD CONSTRAINT `verifactu_registry_business_id_businesses_id_fk` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verifactu_registry` ADD CONSTRAINT `verifactu_registry_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_registry` ON `verifactu_events` (`registry_id`);--> statement-breakpoint
CREATE INDEX `idx_invoice` ON `verifactu_registry` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `verifactu_registry` (`transmission_status`);--> statement-breakpoint
CREATE INDEX `idx_retry` ON `verifactu_registry` (`next_retry_at`);--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_bank_id_banks_id_fk` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `received_invoices` ADD CONSTRAINT `received_invoices_provider_id_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `received_invoices` ADD CONSTRAINT `received_invoices_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `received_invoices` ADD CONSTRAINT `received_invoices_bank_id_banks_id_fk` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE no action ON UPDATE no action;