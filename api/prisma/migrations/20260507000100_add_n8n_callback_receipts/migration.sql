CREATE TABLE IF NOT EXISTS recallhub_workflow.rh_n8n_callback_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  workflow_code text NOT NULL,
  signature text NOT NULL,
  timestamp text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rh_n8n_callback_receipts_run_id_signature_key
  ON recallhub_workflow.rh_n8n_callback_receipts(run_id, signature);

CREATE INDEX IF NOT EXISTS rh_n8n_callback_receipts_run_id_idx
  ON recallhub_workflow.rh_n8n_callback_receipts(run_id);
