CREATE TABLE "document_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"started_by" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"lex_file" text,
	"json_file" json DEFAULT '{}'::json,
	"md_file" text,
	"init" timestamp,
	"publish" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_flow_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"flow_id" uuid NOT NULL,
	"status" text DEFAULT 'initiated' NOT NULL,
	"execution_data" json DEFAULT '{}'::json,
	"flow_tasks" json DEFAULT '{}'::json,
	"started_by" integer NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"origem" text NOT NULL,
	"objeto" text NOT NULL,
	"tipo" text DEFAULT '' NOT NULL,
	"cliente" text NOT NULL,
	"responsavel" text NOT NULL,
	"sistema" text NOT NULL,
	"modulo" text NOT NULL,
	"descricao" text NOT NULL,
	"status" text DEFAULT 'Processando' NOT NULL,
	"status_origem" text DEFAULT 'Incluido' NOT NULL,
	"solicitante" text DEFAULT '' NOT NULL,
	"aprovador" text DEFAULT '' NOT NULL,
	"agente" text DEFAULT '' NOT NULL,
	"task_state" text,
	"id_origem" bigint,
	"id_origem_txt" text,
	"general_columns" json DEFAULT '{}'::json,
	"monday_item_values" json DEFAULT '{}'::json,
	"assets_synced" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documento_id" uuid NOT NULL,
	"name" text NOT NULL,
	"file_data" text DEFAULT '',
	"file_name" text DEFAULT '',
	"file_size" text,
	"mime_type" text DEFAULT 'application/octet-stream',
	"type" text DEFAULT 'unknown',
	"origin_asset_id" text,
	"is_image" text,
	"monday_column" text,
	"file_metadata" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents_flows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"code" text NOT NULL,
	"flow_type_id" uuid,
	"flow_data" json NOT NULL,
	"user_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"is_locked" boolean DEFAULT false,
	"is_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "documents_flows_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "flow_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"node_metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "global_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"file_data" text DEFAULT '',
	"file_name" text DEFAULT '',
	"file_size" text,
	"mime_type" text DEFAULT 'application/octet-stream',
	"type" text DEFAULT 'unknown',
	"is_image" text DEFAULT 'false',
	"uploaded_by" integer,
	"description" text DEFAULT '',
	"tags" text DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lexical_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"plain_text" text,
	"user_id" integer NOT NULL,
	"is_public" boolean DEFAULT false,
	"tags" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mapping_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mapping_id" uuid NOT NULL,
	"monday_column_id" text NOT NULL,
	"monday_column_title" text NOT NULL,
	"cpx_field" text NOT NULL,
	"transform_function" text DEFAULT '',
	"is_key" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "monday_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mapping_id" uuid NOT NULL,
	"column_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "monday_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"board_id" text NOT NULL,
	"quadro_monday" text DEFAULT '',
	"status_column" text DEFAULT '',
	"responsible_column" text DEFAULT '',
	"mapping_filter" text DEFAULT '',
	"default_values" json DEFAULT '{}'::json,
	"assets_mappings" json DEFAULT '[]'::json,
	"schedules_params" json DEFAULT '{"enabled":false,"frequency":"daily","time":"09:00","days":[]}'::json,
	"last_sync" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "plugins" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"author" text,
	"icon" text DEFAULT 'Puzzle',
	"page_name" text,
	"configuration" json DEFAULT '{}'::json,
	"endpoints" json DEFAULT '{}'::json,
	"permissions" json DEFAULT '[]'::json,
	"dependencies" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repo_structure" (
	"uid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_name" text NOT NULL,
	"linked_to" uuid,
	"is_sync" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_name" text NOT NULL,
	"token" text NOT NULL,
	"description" text DEFAULT '',
	"parameters" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "service_connections_service_name_unique" UNIQUE("service_name")
);
--> statement-breakpoint
CREATE TABLE "app_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"message" text NOT NULL,
	"parameters" json DEFAULT '{}'::json,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"structure" json NOT NULL,
	"mappings" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'USER' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"avatar_url" text DEFAULT '',
	"must_change_password" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "document_editions" ADD CONSTRAINT "document_editions_document_id_documentos_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_editions" ADD CONSTRAINT "document_editions_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_editions" ADD CONSTRAINT "document_editions_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_flow_executions" ADD CONSTRAINT "document_flow_executions_document_id_documentos_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_flow_executions" ADD CONSTRAINT "document_flow_executions_flow_id_documents_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."documents_flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_flow_executions" ADD CONSTRAINT "document_flow_executions_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents_artifacts" ADD CONSTRAINT "documents_artifacts_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents_flows" ADD CONSTRAINT "documents_flows_flow_type_id_flow_types_id_fk" FOREIGN KEY ("flow_type_id") REFERENCES "public"."flow_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents_flows" ADD CONSTRAINT "documents_flows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents_flows" ADD CONSTRAINT "documents_flows_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents_flows" ADD CONSTRAINT "documents_flows_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_assets" ADD CONSTRAINT "global_assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lexical_documents" ADD CONSTRAINT "lexical_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mapping_columns" ADD CONSTRAINT "mapping_columns_mapping_id_monday_mappings_id_fk" FOREIGN KEY ("mapping_id") REFERENCES "public"."monday_mappings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monday_columns" ADD CONSTRAINT "monday_columns_mapping_id_monday_mappings_id_fk" FOREIGN KEY ("mapping_id") REFERENCES "public"."monday_mappings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_structure" ADD CONSTRAINT "repo_structure_linked_to_repo_structure_uid_fk" FOREIGN KEY ("linked_to") REFERENCES "public"."repo_structure"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_logs" ADD CONSTRAINT "app_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;