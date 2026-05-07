# RecallHub Appsmith Implementation Blueprint (Risk-Controlled)

این سند نسخه نهایی و ریسک-کنترل‌شده‌ی توسعه Appsmith برای RecallHub است.

منبع قطعی تحلیل:
- `appsmith_nestjs_n8n_control_plane_development_ready_RECALLHUB_EDITED.md`

هدف این سند:
1) از صفر تا صد، مسیر پیاده‌سازی UI کنترل‌پلین RecallHub را مشخص کند.  
2) تضمین کند در Appsmith هیچ business logic خطرناک، حدس تحلیلی، یا bypass روی NestJS/n8n رخ ندهد.  
3) هر ریسک معماری اصلی را با Rule عملیاتی و چک‌لیست قابل اجرا پوشش دهد.

---

## 0) خطوط قرمز (Non-Negotiable Rules)

### R0-1: Appsmith فقط Presentation + API Consumer است
- Appsmith نباید state machine اجرا کند.
- Appsmith نباید تصمیم domain بگیرد.
- Appsmith نباید داده دامنه را مستقیم در DB بنویسد.

### R0-2: Appsmith هرگز n8n را مستقیم صدا نمی‌زند
- فقط NestJS endpointها مجاز هستند.
- هر trigger workflow باید از NestJS عبور کند.

### R0-3: بدون default مخفی
- در UI هیچ مقدار پیش‌فرض پنهانی برای `projectCode`, `repoRoot`, `frameworkVersion` تنظیم نشود.
- اگر کاربر داده نداده، UI باید صریحاً از کاربر بگیرد یا API خطا برگرداند.

### R0-4: Appsmith نباید «unknown» را حدس بزند
- هر داده‌ی نامطمئن باید `unknown` یا `needs_user_input` بماند.
- UI نباید مقدارسازی تخمینی انجام دهد.

### R0-5: Approval Gate اجباری
- UI نباید راهی برای دور زدن Human Approval داشته باشد.

---

## 1) مرز مسئولیت‌ها (Appsmith / NestJS / n8n)

## Appsmith
- فرم، جدول، داشبورد، تعامل کاربر
- اعتبارسنجی سطح UX (مثلاً required field)
- نمایش state/result/error

## NestJS
- مالک persistence
- validation نهایی
- authorization
- audit log
- workflow run/state machine
- callback verification

## n8n
- executor برای automation/LLM/integration
- تولید artifact ساخت‌یافته
- callback امضاشده به NestJS

---

## 2) ریسک‌ماتریس و کنترل‌های اجباری در Appsmith

| ریسک | کنترل در Appsmith | Rule قابل تست |
|---|---|---|
| bypass کردن NestJS | همه queryها فقط Base URL API | هیچ query با URL ن8n یا DB وجود نداشته باشد |
| state machine در UI | دکمه‌ها فقط بر اساس status enable/disable می‌شوند، transition واقعی در backend | UI هرگز status را locally mutate نکند |
| حدس تحلیلی | فیلدهای اجباری صریح + unknown support | هیچ autofill پنهان برای domain fields |
| اجرای بدون approval | دکمه‌های execution در status نامجاز غیرفعال | قبل از approve، action اجرا نشود |
| callback trust در UI | داده callback فقط از endpointهای NestJS خوانده شود | UI هرگز payload خام n8n را truth تلقی نکند |
| نشت secret | token/secret hard-code نشود | جستجو در JS Objectها بدون secret literal |

---

## 3) Setup عملیاتی Appsmith

## 3.1 Data Source
- Name: `RecallHubAPI`
- Base URL: `http://api:3000/api/v1` (یا env-specific URL)
- Auth: JWT / API Key
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{appsmith.store.token}}`

## 3.2 App Store Contract
- `token`
- `activeProjectCode`
- `activeWorkItemId`
- `activeRunId`
- `activeRole` (اختیاری برای UX gating)

## 3.3 URL State
- `?project=...`
- `?workItem=...`
- `?run=...`

هدف: Deep-link، handover، reproducibility.

---

## 4) صفحه‌ها از صفر تا صد

## P01_Login
### هدف
دریافت token و ذخیره امن در store.

### Do/Don't
- ✅ token در storeValue ذخیره شود.
- ❌ token در JS code hard-code نشود.

---

## P10_Project_Setup_Wizard
### هدف
تعریف project profile کامل بدون default مخفی.

### Step 1 — Create Project
`POST /projects`

Required UI fields:
- `project_code`
- `name`
- `description`
- `primary_framework.name`
- `primary_framework.version`
- `tech_stack[]` با حداقل یک `declared`

### Step 2 — Add Repository
`POST /projects/:projectCode/repositories`

### Step 3 — Add Paths
`POST /projects/:projectCode/paths`

### Step 4 — Add Config Files
`POST /projects/:projectCode/config-files`

### Step 5 — Validate + Sync
- `POST /projects/:projectCode/repositories/:repoId/validate`
- `POST /projects/:projectCode/sync`

### ریسک‌های این صفحه
- اگر `repoRoot` دلخواه/غیرمجاز وارد شود، backend باید رد کند.
- UI باید خطاهای validation backend را کامل و شفاف نمایش دهد.

---

## P20_Project_Memory
### هدف
نمایش حافظه پروژه (read-only + traceable).

Queries:
- `GET /projects/:projectCode/modules`
- `GET /projects/:projectCode/files`
- `GET /projects/:projectCode/memory-chunks`
- `GET /projects/:projectCode/memory-events`
- `GET /projects/:projectCode/memory-commits`

### Rule
- UI فقط نمایش می‌دهد؛ هیچ write مستقیم به memory tables وجود ندارد.

---

## P30_Work_Items
### هدف
کنترل چرخه کامل توسعه task.

### Create Work Item
`POST /projects/:projectCode/work-items`

### List Work Items
`GET /projects/:projectCode/work-items`

### Read Context Packet
`GET /work-items/:workItemId/context-packet`

### Pipeline Actions
- `POST /work-items/:workItemId/research/start`
- `POST /work-items/:workItemId/spec/start`
- `POST /work-items/:workItemId/human-approval`
- `POST /work-items/:workItemId/memory-commit`

### Status-aware UX (اجباری)
- فقط actionهای مجاز برای status فعلی فعال شوند.
- هر action نامجاز باید disabled + tooltip توضیحی داشته باشد.
- UI نباید status را حدس بزند یا locally set کند؛ بعد از هر action re-fetch انجام دهد.

---

## P40_Workflow_Runs_Monitor
### هدف
رهگیری شفاف automation.

Queries:
- `GET /workflows`
- `POST /workflows/:code/run`
- `GET /workflow-runs`
- `GET /workflow-runs/:runId`
- `GET /workflow-runs/:runId/events`

### Rule
- نمایش terminal statuses: `succeeded`, `failed`, `cancelled`, `timed_out`, `callback_missing`
- برای runهای in-flight، polling محدود با backoff انجام شود.

---

## P50_Stability_Dashboard
### هدف
عملیات پایدارسازی production.

Queries:
- `GET /health/stability`
- `POST /admin/reconcile/workflow-runs?stale_minutes=...`

### Rule
- این صفحه فقط برای role مجاز نمایش داده شود.
- قبل از reconcile یک confirm modal اجباری باشد.

---

## P60_Audit_Timeline
### هدف
قابلیت پیگیری اینکه «چه کسی، چه کاری، چه زمانی» انجام داد.

اگر endpoint audit وجود دارد:
- `GET /audit/logs?...`

در غیر اینصورت موقت:
- `memory-events` + `workflow events` timeline

---

## 5) Query Library استاندارد

نام‌گذاری پیشنهادی:
- `qAuthSaveToken`
- `qProjectCreate`
- `qProjectGet`
- `qRepoCreate`
- `qRepoValidate`
- `qPathCreate`
- `qConfigCreate`
- `qProjectSync`
- `qMemoryModules`
- `qMemoryFiles`
- `qMemoryEvents`
- `qMemoryCommits`
- `qWorkItemCreate`
- `qWorkItemList`
- `qWorkItemContext`
- `qWorkItemResearchStart`
- `qWorkItemSpecStart`
- `qWorkItemApproval`
- `qWorkItemMemoryCommit`
- `qWorkflowList`
- `qWorkflowRunCreate`
- `qWorkflowRunsList`
- `qWorkflowRunEvents`
- `qStabilityHealth`
- `qStabilityReconcile`

---

## 6) JS Objects (بدون business logic دامنه)

## `JS_ProjectFlow`
- `createProjectWizardFlow()`
- `validateRepositoryAndSync()`

## `JS_WorkItemFlow`
- `startResearch()`
- `startSpec()`
- `submitApproval(decision)`
- `submitMemoryCommit()`

## `JS_RunMonitor`
- `pollRun(runId)`
- `stopOnTerminal(run)`

### قاعده مهم
- JS Objectها فقط orchestrator UI باشند.
- هیچ محاسبه دامنه‌ای که باید در NestJS باشد داخل JS انجام نشود.

---

## 7) Validation Strategy (UI vs Backend)

## UI Validation (light)
- required fields
- format اولیه
- disable action در حالت نامجاز

## Backend Validation (source of truth)
- permission
- state transition validity
- idempotency
- repo path policy
- artifact/callback integrity

Rule:
- اگر backend گفت invalid، UI نباید override کند.

---

## 8) Error Handling Contract در Appsmith

دسته‌بندی خطاها:
1. Validation errors (400/422)
2. Auth/Permission (401/403)
3. Conflict/Idempotency (409)
4. System errors (500)

UX Rule:
- پیام فنی raw نمایش داده نشود.
- toast/user-message قابل فهم + panel جزئیات فنی برای تیم توسعه ارائه شود.

---

## 9) Security Hardening Checklist

- [ ] هیچ URL مستقیم n8n در queryها نیست.
- [ ] هیچ secret hard-coded در widget/js نیست.
- [ ] endpointهای admin فقط برای role مجاز visible هستند.
- [ ] قبل از actionهای تخریبی confirm modal داریم.
- [ ] token lifecycle (set/update/clear) تعریف شده.
- [ ] logout token را از store پاک می‌کند.

---

## 10) UAT Scenarios (از صفر تا صد)

## سناریو A — Onboarding کامل پروژه
1. login
2. create project
3. create repository
4. add paths
5. add config files
6. validate repo
7. sync project
8. مشاهده modules/files/events

قبولی:
- هیچ مقدار default مخفی استفاده نشده باشد.
- sync run قابل رهگیری باشد.

## سناریو B — WorkItem کامل
1. create work item
2. start research
3. start spec
4. human approval
5. memory commit
6. completed

قبولی:
- هیچ transition نامعتبر از UI قابل انجام نباشد.

## سناریو C — عملیات پایدارسازی
1. health dashboard باز شود
2. stale run دیده شود
3. reconcile اجرا شود
4. run status آپدیت شود

قبولی:
- reconcile فقط برای role مجاز اجرا شود.

---

## 11) Definition of Done (Appsmith)

Appsmith آماده‌ی بهره‌برداری است اگر:

1. کل flow پروژه از setup تا sync بدون bypass انجام شود.
2. کل flow work item از request تا memory commit قابل اجرا باشد.
3. workflow monitor و stability dashboard عملیاتی باشند.
4. هیچ business logic دامنه‌ای خارج NestJS نباشد.
5. هیچ call مستقیم به n8n/DB در Appsmith وجود نداشته باشد.
6. رفتار UI با status machine backend سازگار و قابل ممیزی باشد.

---

## 12) لیست Endpointهای مرجع

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

این سند عمداً Appsmith را در مرز UI نگه می‌دارد تا ریسک‌های business logic، تحلیل اشتباه، و تداخل با NestJS/n8n حذف شود.

---

## 13) فایل‌های آماده برای پیاده‌سازی سریع

برای اینکه این سند مستقیم قابل اجرا باشد، این artifactها داخل ریپو اضافه شده‌اند:

- `appsmith/config/datasource.template.json`
- `appsmith/RecallHub_Control_Plane.json`
- `appsmith/scripts/generate_appsmith_export.mjs`
- `appsmith/application.manifest.json`
- `appsmith/queries/projects.json`
- `appsmith/queries/memory.json`
- `appsmith/queries/work_items.json`
- `appsmith/queries/workflows.json`
- `appsmith/queries/stability.json`
- `appsmith/queries/audit.json`
- `appsmith/queries/auth.json`
- `appsmith/jsobjects/JS_AppShell.js`
- `appsmith/jsobjects/JS_ProjectFlow.js`
- `appsmith/jsobjects/JS_WorkItemFlow.js`
- `appsmith/jsobjects/JS_RunMonitor.js`
- `appsmith/pages/P01_Login.json`
- `appsmith/pages/P10_Project_Setup_Wizard.json`
- `appsmith/pages/P20_Project_Memory.json`
- `appsmith/pages/P30_Work_Items.json`
- `appsmith/pages/P40_Workflow_Runs_Monitor.json`
- `appsmith/pages/P50_Stability_Dashboard.json`
- `appsmith/pages/P60_Audit_Timeline.json`
- `appsmith/pages/IMPLEMENTATION_CHECKLIST.md`
- `appsmith/scripts/validate_appsmith_contract.sh`

فایل‌های `pages/`, `queries/`, و `jsobjects/` قرارداد توسعه هستند؛ فایل `RecallHub_Control_Plane.json` خروجی import واقعی Appsmith است.

---

## 14) وضعیت پیاده‌سازی فعلی

این پوشه اکنون یک implementation pack کامل برای ساخت Appsmith دارد:

1. `RecallHub_Control_Plane.json` فایل import واقعی Appsmith است و با schema exportهای آماده ساخته شده است.
2. `scripts/generate_appsmith_export.mjs` از قراردادهای همین پوشه، صفحه‌ها، queryها، JS Objectهای صفحه‌ای و datasource را بازتولید می‌کند.
3. `application.manifest.json` قرارداد app، store، URL state و صفحه‌ها را مشخص می‌کند.
4. فایل‌های `pages/P*.json` تعریف منطقی widgetها، bindingها، queryها و actionها هستند.
5. Queryها با endpointهای فعلی NestJS در `api/src/**.controller.ts` هم‌راستا شده‌اند.
6. JS Objectها فقط orchestration سبک UI انجام می‌دهند و بعد از هر action از backend دوباره fetch می‌کنند.
7. `scripts/validate_appsmith_contract.sh` JSONها و کنترل‌های معماری را بررسی می‌کند.

### ترتیب ساخت در Appsmith

1. در Appsmith از Import application استفاده کنید و فایل `appsmith/RecallHub_Control_Plane.json` را بدهید.
2. بعد از import، datasource با نام `RecallHubAPI` را روی محیط درست تنظیم کنید.
3. اگر Appsmith بیرون از Compose اجرا می‌شود، Base URL را `http://host.docker.internal:3000/api/v1` بگذارید.
4. اگر API و Appsmith داخل همین Compose هستند، Base URL همان `http://api:3000/api/v1` بماند.
5. قبل از UAT این دستور را اجرا کنید:

```bash
./appsmith/scripts/validate_appsmith_contract.sh
```

---

## 15) نصب و اجرای خود Appsmith

خود Appsmith در این پروژه با Docker Compose اجرا می‌شود و سرویس آن در `infra/docker-compose.yml` تعریف شده است:

```yaml
appsmith:
  image: appsmith/appsmith-ce:latest
  ports:
    - "8080:80"
  volumes:
    - appsmith_stacks:/appsmith-stacks
```

اجرای Appsmith:

```bash
docker compose -f infra/docker-compose.yml up -d appsmith
```

آدرس پنل:

```text
http://localhost:8080
```

اگر API را به‌صورت local طبق README ریشه اجرا می‌کنید، داخل Appsmith برای Datasource از این Base URL استفاده کنید:

```text
http://host.docker.internal:3000/api/v1
```

اگر API هم داخل همان Docker Compose به‌عنوان service `api` اجرا شود، Base URL این است:

```text
http://api:3000/api/v1
```

برای اجرای API local:

```bash
cd api
DATABASE_URL='postgresql://recallhub:Aa123456@localhost:15432/recallhub_db' \
REDIS_URL='redis://localhost:6379' \
N8N_INTERNAL_BASE_URL='http://localhost:5678' \
N8N_CALLBACK_SECRET='change_me_callback_secret' \
APP_JWT_SECRET='change_me_jwt_secret' \
ALLOWED_REPO_ROOTS='/workspace/repos,/Users/mohammadsalehpour/Projects' \
npm run start:dev
```
