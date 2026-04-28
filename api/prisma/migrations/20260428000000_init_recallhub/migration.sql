-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "recallhub_audit";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "recallhub_core";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "recallhub_inbox";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "recallhub_memory";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "recallhub_work";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "recallhub_workflow";

-- CreateEnum
CREATE TYPE "recallhub_core"."ProjectStatus" AS ENUM ('draft', 'configured', 'indexed', 'active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "recallhub_core"."TechSource" AS ENUM ('declared', 'detected', 'imported');

-- CreateEnum
CREATE TYPE "recallhub_core"."TechStatus" AS ENUM ('active', 'suggested', 'rejected', 'deprecated');

-- CreateEnum
CREATE TYPE "recallhub_core"."RepositoryStatus" AS ENUM ('pending_validation', 'valid', 'invalid', 'disabled');

-- CreateEnum
CREATE TYPE "recallhub_work"."WorkItemStatus" AS ENUM ('draft', 'needs_project_context', 'needs_research', 'research_in_progress', 'research_ready', 'spec_drafting', 'spec_review', 'needs_human_approval', 'approved_for_implementation', 'implementation_planning', 'implementation_in_progress', 'validation_in_progress', 'done_pending_memory_commit', 'completed', 'blocked', 'rejected', 'cancelled', 'failed', 'superseded');

-- CreateEnum
CREATE TYPE "recallhub_workflow"."WorkflowRunStatus" AS ENUM ('pending', 'queued', 'running', 'succeeded', 'failed', 'cancelled', 'retrying', 'timed_out', 'callback_missing');

-- CreateEnum
CREATE TYPE "recallhub_workflow"."WorkflowExecutor" AS ENUM ('n8n', 'internal_worker', 'manual');

-- CreateTable
CREATE TABLE "recallhub_core"."rh_projects" (
    "id" UUID NOT NULL,
    "project_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "business_domain" TEXT,
    "status" "recallhub_core"."ProjectStatus" NOT NULL,
    "primary_framework_name" TEXT NOT NULL,
    "primary_framework_version" TEXT NOT NULL,
    "owner_id" UUID,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_core"."rh_project_tech_stack" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "source" "recallhub_core"."TechSource" NOT NULL,
    "confidence" DECIMAL(3,2),
    "status" "recallhub_core"."TechStatus" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_project_tech_stack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_core"."rh_project_repositories" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "repo_name" TEXT NOT NULL,
    "locator_type" TEXT NOT NULL,
    "repo_root" TEXT NOT NULL,
    "host_path_hash" TEXT,
    "default_branch" TEXT,
    "current_branch" TEXT,
    "commit_sha" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" "recallhub_core"."RepositoryStatus" NOT NULL,
    "validation_errors_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_project_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_core"."rh_project_paths" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "path_type" TEXT NOT NULL,
    "label" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "scan_policy" TEXT NOT NULL,
    "ownership" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_project_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_core"."rh_project_config_files" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "relative_path" TEXT NOT NULL,
    "config_type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "contains_secrets" TEXT NOT NULL DEFAULT 'unknown',
    "scan_policy" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_project_config_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_memory"."rh_project_modules" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "module_name" TEXT NOT NULL,
    "module_path" TEXT NOT NULL,
    "module_type" TEXT NOT NULL,
    "ownership" TEXT NOT NULL,
    "manifest_json" JSONB,
    "depends_json" JSONB,
    "summary" TEXT,
    "source_status" TEXT NOT NULL DEFAULT 'discovered',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_run_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_project_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_memory"."rh_project_files" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "module_id" UUID,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_ext" TEXT,
    "file_kind" TEXT,
    "file_size_bytes" BIGINT,
    "content_hash" TEXT,
    "scan_policy" TEXT,
    "contains_secrets" BOOLEAN,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_run_id" UUID,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_project_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_memory"."rh_memory_events" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "work_item_id" UUID,
    "event_type" TEXT NOT NULL,
    "actor_id" UUID,
    "reason" TEXT,
    "summary" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "artifact_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rh_memory_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_memory"."rh_memory_commits" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "work_item_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "what_changed" TEXT NOT NULL,
    "why_changed" TEXT NOT NULL,
    "how_changed" TEXT NOT NULL,
    "files_touched_json" JSONB,
    "modules_touched_json" JSONB,
    "commands_run_json" JSONB,
    "validation_result_json" JSONB,
    "risks_remaining_json" JSONB,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rh_memory_commits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_work"."rh_work_items" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "original_request" TEXT NOT NULL,
    "request_type" TEXT NOT NULL,
    "status" "recallhub_work"."WorkItemStatus" NOT NULL,
    "risk_level" TEXT NOT NULL DEFAULT 'medium',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "requested_by" UUID,
    "assigned_to" UUID,
    "open_questions_json" JSONB,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_work"."rh_artifacts" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "work_item_id" UUID,
    "artifact_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content_markdown" TEXT,
    "content_json" JSONB,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "hash" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_workflow"."rh_workflow_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "executor" "recallhub_workflow"."WorkflowExecutor" NOT NULL,
    "n8n_path" TEXT,
    "input_schema_json" JSONB,
    "output_schema_json" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_workflow"."rh_workflow_runs" (
    "id" UUID NOT NULL,
    "workflow_definition_id" UUID NOT NULL,
    "project_id" UUID,
    "work_item_id" UUID,
    "status" "recallhub_workflow"."WorkflowRunStatus" NOT NULL,
    "input_json" JSONB,
    "output_json" JSONB,
    "error_json" JSONB,
    "n8n_execution_id" TEXT,
    "idempotency_key" TEXT,
    "triggered_by" UUID,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_workflow"."rh_workflow_events" (
    "id" UUID NOT NULL,
    "workflow_run_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rh_workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_audit"."rh_audit_logs" (
    "id" UUID NOT NULL,
    "project_id" UUID,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID,
    "outcome" TEXT NOT NULL,
    "reason" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rh_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_inbox"."n8n_artifact_inbox" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "workflow_code" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "n8n_artifact_inbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rh_projects_project_code_key" ON "recallhub_core"."rh_projects"("project_code");

-- CreateIndex
CREATE INDEX "rh_project_tech_stack_project_id_idx" ON "recallhub_core"."rh_project_tech_stack"("project_id");

-- CreateIndex
CREATE INDEX "rh_project_repositories_project_id_idx" ON "recallhub_core"."rh_project_repositories"("project_id");

-- CreateIndex
CREATE INDEX "rh_project_paths_project_id_idx" ON "recallhub_core"."rh_project_paths"("project_id");

-- CreateIndex
CREATE INDEX "rh_project_paths_repository_id_idx" ON "recallhub_core"."rh_project_paths"("repository_id");

-- CreateIndex
CREATE INDEX "rh_project_config_files_project_id_idx" ON "recallhub_core"."rh_project_config_files"("project_id");

-- CreateIndex
CREATE INDEX "rh_project_modules_project_id_idx" ON "recallhub_memory"."rh_project_modules"("project_id");

-- CreateIndex
CREATE INDEX "rh_project_files_project_id_idx" ON "recallhub_memory"."rh_project_files"("project_id");

-- CreateIndex
CREATE INDEX "rh_memory_events_project_id_idx" ON "recallhub_memory"."rh_memory_events"("project_id");

-- CreateIndex
CREATE INDEX "rh_memory_commits_project_id_idx" ON "recallhub_memory"."rh_memory_commits"("project_id");

-- CreateIndex
CREATE INDEX "rh_work_items_project_id_idx" ON "recallhub_work"."rh_work_items"("project_id");

-- CreateIndex
CREATE INDEX "rh_artifacts_project_id_idx" ON "recallhub_work"."rh_artifacts"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "rh_workflow_definitions_code_key" ON "recallhub_workflow"."rh_workflow_definitions"("code");

-- CreateIndex
CREATE INDEX "rh_workflow_runs_project_id_idx" ON "recallhub_workflow"."rh_workflow_runs"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "rh_workflow_runs_workflow_definition_id_idempotency_key_key" ON "recallhub_workflow"."rh_workflow_runs"("workflow_definition_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "rh_workflow_events_workflow_run_id_idx" ON "recallhub_workflow"."rh_workflow_events"("workflow_run_id");

-- CreateIndex
CREATE INDEX "rh_audit_logs_project_id_idx" ON "recallhub_audit"."rh_audit_logs"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "n8n_artifact_inbox_run_id_workflow_code_signature_key" ON "recallhub_inbox"."n8n_artifact_inbox"("run_id", "workflow_code", "signature");

-- AddForeignKey
ALTER TABLE "recallhub_core"."rh_project_tech_stack" ADD CONSTRAINT "rh_project_tech_stack_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "recallhub_core"."rh_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_core"."rh_project_repositories" ADD CONSTRAINT "rh_project_repositories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "recallhub_core"."rh_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_core"."rh_project_paths" ADD CONSTRAINT "rh_project_paths_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "recallhub_core"."rh_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_core"."rh_project_paths" ADD CONSTRAINT "rh_project_paths_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "recallhub_core"."rh_project_repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_core"."rh_project_config_files" ADD CONSTRAINT "rh_project_config_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "recallhub_core"."rh_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_core"."rh_project_config_files" ADD CONSTRAINT "rh_project_config_files_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "recallhub_core"."rh_project_repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_memory"."rh_project_modules" ADD CONSTRAINT "rh_project_modules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "recallhub_core"."rh_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_memory"."rh_project_modules" ADD CONSTRAINT "rh_project_modules_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "recallhub_core"."rh_project_repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_memory"."rh_project_files" ADD CONSTRAINT "rh_project_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "recallhub_core"."rh_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_memory"."rh_project_files" ADD CONSTRAINT "rh_project_files_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "recallhub_core"."rh_project_repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_memory"."rh_project_files" ADD CONSTRAINT "rh_project_files_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "recallhub_memory"."rh_project_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_memory"."rh_memory_events" ADD CONSTRAINT "rh_memory_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "recallhub_core"."rh_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_memory"."rh_memory_events" ADD CONSTRAINT "rh_memory_events_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "recallhub_work"."rh_work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_memory"."rh_memory_commits" ADD CONSTRAINT "rh_memory_commits_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "recallhub_core"."rh_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_memory"."rh_memory_commits" ADD CONSTRAINT "rh_memory_commits_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "recallhub_work"."rh_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_work"."rh_work_items" ADD CONSTRAINT "rh_work_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "recallhub_core"."rh_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_work"."rh_artifacts" ADD CONSTRAINT "rh_artifacts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "recallhub_core"."rh_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_work"."rh_artifacts" ADD CONSTRAINT "rh_artifacts_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "recallhub_work"."rh_work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_workflow"."rh_workflow_runs" ADD CONSTRAINT "rh_workflow_runs_workflow_definition_id_fkey" FOREIGN KEY ("workflow_definition_id") REFERENCES "recallhub_workflow"."rh_workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_workflow"."rh_workflow_runs" ADD CONSTRAINT "rh_workflow_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "recallhub_core"."rh_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_workflow"."rh_workflow_runs" ADD CONSTRAINT "rh_workflow_runs_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "recallhub_work"."rh_work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_workflow"."rh_workflow_events" ADD CONSTRAINT "rh_workflow_events_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "recallhub_workflow"."rh_workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_audit"."rh_audit_logs" ADD CONSTRAINT "rh_audit_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "recallhub_core"."rh_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
