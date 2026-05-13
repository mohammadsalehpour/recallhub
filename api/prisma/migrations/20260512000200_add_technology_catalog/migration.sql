-- Technology catalog for local-first project tech selection.

CREATE TABLE "recallhub_core"."rh_technology_catalog" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "canonical_name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ecosystem" TEXT,
    "description" TEXT,
    "homepage_url" TEXT,
    "repository_url" TEXT,
    "license" TEXT,
    "latest_version" TEXT,
    "source" TEXT NOT NULL,
    "confidence" DECIMAL(3,2),
    "status" "recallhub_core"."TechStatus" NOT NULL DEFAULT 'active',
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_technology_catalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recallhub_core"."rh_technology_versions" (
    "id" UUID NOT NULL,
    "technology_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_deprecated" BOOLEAN NOT NULL DEFAULT false,
    "deprecated_reason" TEXT,
    "licenses_json" JSONB,
    "advisories_json" JSONB,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_technology_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recallhub_core"."rh_technology_aliases" (
    "id" UUID NOT NULL,
    "technology_id" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rh_technology_aliases_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "recallhub_core"."rh_project_tech_stack"
  ADD COLUMN "technology_id" UUID;

CREATE UNIQUE INDEX "rh_technology_catalog_slug_key" ON "recallhub_core"."rh_technology_catalog"("slug");
CREATE INDEX "rh_technology_catalog_kind_idx" ON "recallhub_core"."rh_technology_catalog"("kind");
CREATE INDEX "rh_technology_catalog_ecosystem_idx" ON "recallhub_core"."rh_technology_catalog"("ecosystem");
CREATE INDEX "rh_technology_catalog_status_idx" ON "recallhub_core"."rh_technology_catalog"("status");
CREATE INDEX "rh_technology_catalog_canonical_name_idx" ON "recallhub_core"."rh_technology_catalog"("canonical_name");

CREATE UNIQUE INDEX "rh_technology_versions_technology_id_version_key" ON "recallhub_core"."rh_technology_versions"("technology_id", "version");
CREATE INDEX "rh_technology_versions_technology_id_idx" ON "recallhub_core"."rh_technology_versions"("technology_id");

CREATE UNIQUE INDEX "rh_technology_aliases_technology_id_alias_key" ON "recallhub_core"."rh_technology_aliases"("technology_id", "alias");
CREATE INDEX "rh_technology_aliases_alias_idx" ON "recallhub_core"."rh_technology_aliases"("alias");

CREATE INDEX "rh_project_tech_stack_technology_id_idx" ON "recallhub_core"."rh_project_tech_stack"("technology_id");

ALTER TABLE "recallhub_core"."rh_technology_versions"
  ADD CONSTRAINT "rh_technology_versions_technology_id_fkey"
  FOREIGN KEY ("technology_id") REFERENCES "recallhub_core"."rh_technology_catalog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recallhub_core"."rh_technology_aliases"
  ADD CONSTRAINT "rh_technology_aliases_technology_id_fkey"
  FOREIGN KEY ("technology_id") REFERENCES "recallhub_core"."rh_technology_catalog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recallhub_core"."rh_project_tech_stack"
  ADD CONSTRAINT "rh_project_tech_stack_technology_id_fkey"
  FOREIGN KEY ("technology_id") REFERENCES "recallhub_core"."rh_technology_catalog"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
