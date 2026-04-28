-- CreateTable
CREATE TABLE "recallhub_memory"."rh_memory_chunks" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" UUID,
    "chunk_key" TEXT NOT NULL,
    "chunk_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding_ref" TEXT,
    "sensitivity" TEXT NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_memory_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rh_memory_chunks_chunk_key_key" ON "recallhub_memory"."rh_memory_chunks"("chunk_key");

-- CreateIndex
CREATE INDEX "rh_memory_chunks_project_id_idx" ON "recallhub_memory"."rh_memory_chunks"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "rh_project_files_project_id_repository_id_file_path_key" ON "recallhub_memory"."rh_project_files"("project_id", "repository_id", "file_path");

-- CreateIndex
CREATE UNIQUE INDEX "rh_project_modules_project_id_repository_id_module_path_key" ON "recallhub_memory"."rh_project_modules"("project_id", "repository_id", "module_path");

-- AddForeignKey
ALTER TABLE "recallhub_memory"."rh_memory_chunks" ADD CONSTRAINT "rh_memory_chunks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "recallhub_core"."rh_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_memory"."rh_memory_chunks" ADD CONSTRAINT "rh_memory_chunks_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "recallhub_memory"."rh_project_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
