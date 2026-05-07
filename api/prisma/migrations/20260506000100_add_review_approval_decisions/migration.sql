CREATE TABLE IF NOT EXISTS recallhub_work.rh_document_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES recallhub_core.rh_projects(id) ON DELETE CASCADE,
  work_item_id uuid NOT NULL REFERENCES recallhub_work.rh_work_items(id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES recallhub_work.rh_artifacts(id) ON DELETE CASCADE,
  reviewer_role text NOT NULL,
  decision text NOT NULL,
  score integer,
  notes_md text,
  blockers_json jsonb,
  warnings_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rh_document_reviews_project_id_idx
  ON recallhub_work.rh_document_reviews(project_id);

CREATE INDEX IF NOT EXISTS rh_document_reviews_work_item_id_idx
  ON recallhub_work.rh_document_reviews(work_item_id);

CREATE INDEX IF NOT EXISTS rh_document_reviews_artifact_id_idx
  ON recallhub_work.rh_document_reviews(artifact_id);

CREATE TABLE IF NOT EXISTS recallhub_work.rh_human_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES recallhub_core.rh_projects(id) ON DELETE CASCADE,
  work_item_id uuid NOT NULL REFERENCES recallhub_work.rh_work_items(id) ON DELETE CASCADE,
  artifact_id uuid REFERENCES recallhub_work.rh_artifacts(id) ON DELETE SET NULL,
  decision text NOT NULL,
  reviewed_by uuid,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rh_human_approvals_project_id_idx
  ON recallhub_work.rh_human_approvals(project_id);

CREATE INDEX IF NOT EXISTS rh_human_approvals_work_item_id_idx
  ON recallhub_work.rh_human_approvals(work_item_id);

CREATE INDEX IF NOT EXISTS rh_human_approvals_artifact_id_idx
  ON recallhub_work.rh_human_approvals(artifact_id);

CREATE TABLE IF NOT EXISTS recallhub_work.rh_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES recallhub_core.rh_projects(id) ON DELETE CASCADE,
  work_item_id uuid REFERENCES recallhub_work.rh_work_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  context text NOT NULL,
  decision text NOT NULL,
  alternatives_json jsonb,
  consequences text,
  status text NOT NULL DEFAULT 'proposed',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rh_decisions_project_id_idx
  ON recallhub_work.rh_decisions(project_id);

CREATE INDEX IF NOT EXISTS rh_decisions_work_item_id_idx
  ON recallhub_work.rh_decisions(work_item_id);
