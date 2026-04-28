# RecallHub Appsmith Plan (Post Phase 6)

با توجه به اینکه ۶ فاز backend جلو رفته، توسعه UI/کنترل‌پنل می‌تواند از اینجا شروع شود.

## صفحات MVP پیشنهادی

1. **Project Setup Wizard**
   - ساخت پروژه
   - ثبت repository/path/config files
   - trigger sync

2. **Work Items Board**
   - لیست work itemها
   - ایجاد work item
   - شروع research/spec
   - ثبت human approval

3. **Workflow Runs Monitor**
   - لیست workflow runها و eventها
   - مشاهده callback outcome و artifact

4. **Stability Dashboard**
   - نمایش `GET /health/stability`
   - دکمه reconcile stale runs (`POST /admin/reconcile/workflow-runs`)

## API binding (Appsmith Queries)

- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `POST /api/v1/projects/:projectCode/repositories`
- `POST /api/v1/projects/:projectCode/paths`
- `POST /api/v1/projects/:projectCode/config-files`
- `POST /api/v1/projects/:projectCode/sync`
- `GET /api/v1/projects/:projectCode/work-items`
- `POST /api/v1/projects/:projectCode/work-items`
- `POST /api/v1/work-items/:workItemId/research/start`
- `POST /api/v1/work-items/:workItemId/spec/start`
- `POST /api/v1/work-items/:workItemId/human-approval`
- `POST /api/v1/work-items/:workItemId/memory-commit`
- `GET /api/v1/workflow-runs`
- `GET /api/v1/workflow-runs/:runId/events`
- `GET /api/v1/health/stability`
- `POST /api/v1/admin/reconcile/workflow-runs`

## ترتیب توسعه پیشنهادی

- Sprint 1: Project Setup Wizard + Sync trigger
- Sprint 2: Work Items Board + pipeline actions
- Sprint 3: Workflow/Stability dashboards + audit timeline
