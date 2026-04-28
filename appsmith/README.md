# RecallHub Appsmith Development Guide (کامل و عملیاتی)

این سند، راهنمای کامل توسعه Appsmith برای RecallHub است و بر اساس سند اصلی زیر بازنویسی شده:

- `appsmith_nestjs_n8n_control_plane_development_ready_RECALLHUB_EDITED.md`

هدف: از **صفر تا صد**، از ایجاد پروژه تا اجرای چرخه کامل توسعه (Research → Spec → Review → Approval → Execution → Memory Commit) در Appsmith.

---

## 1) اصول معماری که Appsmith باید رعایت کند

## قاعده طلایی

Appsmith فقط **UI + API Consumer** است.

- Appsmith نباید مستقیم به دیتابیس دامنه RecallHub وصل شود.
- Appsmith نباید n8n را مستقیم صدا بزند.
- تمام عملیات باید فقط از مسیر NestJS API انجام شود.

## جریان استاندارد

1. کاربر در Appsmith عملیاتی انجام می‌دهد.
2. Appsmith درخواست را به NestJS می‌فرستد.
3. NestJS اعتبارسنجی/مجوز/State Machine/ثبت Audit را انجام می‌دهد.
4. در صورت نیاز، NestJS workflow run می‌سازد و n8n را trigger می‌کند.
5. n8n callback امضاشده را به NestJS برمی‌گرداند.
6. Appsmith وضعیت و نتیجه را فقط از NestJS می‌خواند.

---

## 2) پیش‌نیازها

- API NestJS بالا باشد (`/api/v1`).
- مدل‌های پروژه/ریپازیتوری/مسیرها و WorkItemها در API فعال باشند.
- endpointهای workflow و callback در API فعال باشند.
- Appsmith به API دسترسی شبکه‌ای داشته باشد.

---

## 3) ساخت Data Source در Appsmith

در Appsmith یک Data Source از نوع REST API بساز:

- **Name:** `RecallHubAPI`
- **Base URL:** `http://api:3000/api/v1` (یا URL محیط)
- **Auth:** JWT یا API Key (مطابق پیاده‌سازی backend)
- **Headers پیش‌فرض:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {{appsmith.store.token}}` (اگر JWT دارید)

پیشنهاد:

- یک صفحه Login بساز و token را در `appsmith.store.token` ذخیره کن.
- قبل از اجرای queryهای حساس، وجود token را validate کن.

---

## 4) ساختار صفحات Appsmith (نسخه Production-Ready)

## 4.1 صفحه: `P01_Login`

هدف: گرفتن JWT/API key و ذخیره در Store.

اجزا:

- Input: `inpToken`
- Button: `btnSaveToken`

اکشن دکمه:

```js
{{
  storeValue('token', inpToken.text, true);
  showAlert('Token ذخیره شد', 'success');
}}
```

---

## 4.2 صفحه: `P10_Project_Setup_Wizard`

هدف: تعریف کامل پروژه و آماده‌سازی Sync.

### Step A — Create Project

فیلدها:

- project_code
- name
- description
- business_domain
- primary_framework.name
- primary_framework.version
- tech_stack[] (حداقل یک declared)

Query: `qCreateProject`

- Method: `POST`
- URL: `/projects`
- Body: از فرم

### Step B — Add Repository

فیلدها:

- repo_name
- locator_type = `local_path`
- repo_root
- is_primary

Query: `qCreateRepository`

- `POST /projects/{{tblProjects.selectedRow.projectCode}}/repositories`

### Step C — Add Paths

برای include/exclude/meta مسیرها.

Query: `qCreatePath`

- `POST /projects/:projectCode/paths`

### Step D — Add Config Files

مثل `.env.example`, `requirements.txt`, `odoo.conf`.

Query: `qCreateConfigFile`

- `POST /projects/:projectCode/config-files`

### Step E — Validate + Sync

- Validate repo: `POST /projects/:projectCode/repositories/:repoId/validate`
- Sync: `POST /projects/:projectCode/sync`

نکته UX:

- حتما idempotency key برای sync بفرست.
- Workflow run id را ذخیره کن تا polling انجام شود.

---

## 4.3 صفحه: `P20_Project_Memory`

هدف: مشاهده حافظه پروژه.

Queryها:

- `GET /projects/:projectCode/modules`
- `GET /projects/:projectCode/files`
- `GET /projects/:projectCode/memory-chunks`
- `GET /projects/:projectCode/memory-events`
- `GET /projects/:projectCode/memory-commits`

Widgetها:

- Tabs: Modules / Files / Chunks / Events / Commits
- Tableهای جدا برای هر dataset
- JSON viewer برای جزئیات ردیف انتخابی

---

## 4.4 صفحه: `P30_WorkItems_Board`

هدف: مدیریت چرخه کار توسعه.

### بخش 1: ایجاد Work Item

Query: `qCreateWorkItem`

- `POST /projects/:projectCode/work-items`

فیلدها:

- title
- original_request
- request_type
- risk_level
- priority
- open_questions[]

### بخش 2: لیست Work Itemها

Query: `qListWorkItems`

- `GET /projects/:projectCode/work-items`

### بخش 3: Context Packet

Query: `qGetContextPacket`

- `GET /work-items/:workItemId/context-packet`

### بخش 4: اجرای pipeline

- Start research: `POST /work-items/:id/research/start`
- Start spec: `POST /work-items/:id/spec/start`
- Human approval: `POST /work-items/:id/human-approval`
- Final memory commit: `POST /work-items/:id/memory-commit`

قواعد مهم UI:

- دکمه‌ها با status کار کنند (state-aware actions).
- اگر status در وضعیت مجاز نیست، دکمه disable و پیام راهنما نمایش بده.

---

## 4.5 صفحه: `P40_Workflow_Runs`

هدف: مانیتور اجرای automationها.

Queryها:

- `GET /workflows`
- `POST /workflows/:code/run`
- `GET /workflow-runs`
- `GET /workflow-runs/:runId`
- `GET /workflow-runs/:runId/events`

پیشنهاد UX:

- Auto-refresh هر 5 تا 10 ثانیه برای runهای pending/running.
- Badge رنگی برای statusها: pending/running/succeeded/failed/callback_missing.
- Link بین run و work_item و artifact.

---

## 4.6 صفحه: `P50_Stability_Dashboard`

هدف: عملیات پایدارسازی.

Queryها:

- `GET /health/stability`
- `POST /admin/reconcile/workflow-runs?stale_minutes=30`

شاخص‌ها:

- project count
- workflow run counts by status
- stale workflow run count

اکشن‌ها:

- دکمه Reconcile stale runs
- نمایش نتیجه updated count + run ids

---

## 4.7 صفحه: `P60_Audit_Timeline`

هدف: رهگیری کامل عملیات.

در صورت endpoint:

- `GET /audit/logs?projectCode=...`

یا جایگزین موقت:

- استفاده از memory events به‌عنوان timeline

---

## 5) Query Naming Convention

برای نگهداری ساده:

- `qProjectCreate`
- `qProjectList`
- `qRepoCreate`
- `qRepoValidate`
- `qPathCreate`
- `qConfigCreate`
- `qProjectSync`
- `qModulesList`
- `qWorkItemCreate`
- `qWorkItemList`
- `qWorkItemResearchStart`
- `qWorkItemSpecStart`
- `qWorkItemHumanApproval`
- `qWorkItemMemoryCommit`
- `qWorkflowRunsList`
- `qWorkflowRunEvents`
- `qHealthStability`
- `qReconcileWorkflowRuns`

---

## 6) Store & URL Params Strategy

Store keys:

- `token`
- `activeProjectCode`
- `activeWorkItemId`
- `activeWorkflowRunId`

URL query params:

- `?project=...&workItem=...&run=...`

برای deep-link و handover بین اعضای تیم.

---

## 7) Validation و UX Rules

- قبل از submit پروژه:
  - `project_code`, `name`, `description`, `primary_framework` نباید خالی باشند.
- قبل از sync:
  - حداقل یک repository معتبر
  - حداقل یک path با `scan_policy != exclude`
- قبل از اجرای spec:
  - status work item در وضعیت مجاز باشد.
- قبل از human approval:
  - user باید reason اختیاری/اجباری طبق policy وارد کند.

Error handling:

- پیام backend را مستقیم نمایش نده؛ normalize کن.
- خطاهای idempotency و conflict را به پیام قابل‌فهم تبدیل کن.

---

## 8) Security Checklist در Appsmith

- هیچ secret در JS Object hard-code نشود.
- token فقط در Store امن Appsmith نگهداری شود.
- direct call به n8n ممنوع.
- endpointهای admin (reconcile) فقط برای نقش مجاز در UI نمایش داده شود.
- قبل از هر action حساس، check role/permission در UI (و قطعی در backend).

---

## 9) State-Aware Button Matrix (Work Items)

- `needs_research` → دکمه Start Research فعال
- `research_ready` → Start Spec فعال
- `spec_review` → Final Review/Revise action
- `needs_human_approval` → Approve/Reject فعال
- `done_pending_memory_commit` → ثبت Memory Commit فعال
- `completed/rejected/cancelled` → همه دکمه‌های pipeline غیرفعال (read-only)

---

## 10) Appsmith JS Objects پیشنهادی

- `JSActionsProject`
  - createProjectWithWizard()
  - validateAndSyncProject()
- `JSActionsWorkItem`
  - createWorkItem()
  - startResearch()
  - startSpec()
  - approveWorkItem()
  - rejectWorkItem()
  - completeWithMemoryCommit()
- `JSPolling`
  - pollWorkflowRun(runId)
  - stopPollingWhenTerminal(status)

---

## 11) Milestone Plan برای تیم Appsmith

### Milestone 1

- Login + Data Source
- Project Setup Wizard کامل
- Project Sync trigger + run tracking

### Milestone 2

- Memory explorer
- WorkItems board (create/list/context)

### Milestone 3

- Research/Spec/Human approval actions
- Workflow runs monitor

### Milestone 4

- Stability dashboard
- Audit timeline
- Hardening UX + permissions + error mapping

---

## 12) Definition of Done (DoD) برای Appsmith RecallHub

وقتی این شروط برقرار شد، Appsmith لایه MVP-ready محسوب می‌شود:

1. کاربر بتواند پروژه کامل تعریف کند (بدون default مخفی).
2. کاربر بتواند sync را اجرا و نتیجه را در UI ببیند.
3. کاربر بتواند WorkItem بسازد و pipeline را تا memory commit جلو ببرد.
4. وضعیت workflow runها و eventها در UI قابل رهگیری باشد.
5. عملیات stability (health + reconcile) در داشبورد عملیاتی قابل انجام باشد.
6. هیچ endpoint مستقیم n8n در UI استفاده نشده باشد.

---

## 13) API Quick Reference (برای Query Library)

- `GET /projects`
- `POST /projects`
- `GET /projects/:projectCode`
- `POST /projects/:projectCode/repositories`
- `POST /projects/:projectCode/repositories/:repoId/validate`
- `POST /projects/:projectCode/paths`
- `POST /projects/:projectCode/config-files`
- `POST /projects/:projectCode/sync`
- `GET /projects/:projectCode/modules`
- `GET /projects/:projectCode/files`
- `GET /projects/:projectCode/memory-chunks`
- `GET /projects/:projectCode/memory-events`
- `GET /projects/:projectCode/memory-commits`
- `POST /projects/:projectCode/work-items`
- `GET /projects/:projectCode/work-items`
- `GET /work-items/:workItemId/context-packet`
- `POST /work-items/:workItemId/research/start`
- `POST /work-items/:workItemId/spec/start`
- `POST /work-items/:workItemId/human-approval`
- `POST /work-items/:workItemId/memory-commit`
- `GET /workflows`
- `POST /workflows/:code/run`
- `GET /workflow-runs`
- `GET /workflow-runs/:runId`
- `GET /workflow-runs/:runId/events`
- `GET /health/stability`
- `POST /admin/reconcile/workflow-runs`

---

اگر این سند دقیق اجرا شود، Appsmith از یک UI ساده به کنترل‌پنل عملیاتی کامل RecallHub تبدیل می‌شود و کل جریان توسعه AI-assisted را بدون شکستن اصول معماری هدایت می‌کند.
