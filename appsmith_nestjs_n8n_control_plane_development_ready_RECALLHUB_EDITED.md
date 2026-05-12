# RecallHub — مستند توسعه آماده پیاده‌سازی

**نام برنامه:** RecallHub  
**نسخه سند:** 2.1 — جایگزینی کامل frontend با Angular و حذف کنترل‌پلین کم‌کد  
**تاریخ بازبینی:** 2026-05-12  
**Stack هدف:** Angular + Tailwind CSS + Nginx + NestJS + n8n + PostgreSQL + Redis  
**اصل قطعی این نسخه:** n8n مالک داده نیست و نباید مستقیم در دیتابیس دامنه چیزی بنویسد. NestJS مالک persistence، validation، permission، audit و state machine است.

---

## 0. خلاصه اجرایی

RecallHub یک «حافظه عملیاتی پروژه» و «کنترل‌پلین توسعه با کمک AI» است. کاربر باید بتواند یک پروژه واقعی را تعریف کند، مسیر repository و تکنولوژی‌های آن را مشخص کند، ساختار فایل‌ها و app/moduleهای اصلی و سفارشی را معرفی کند، سپس هر تحقیق، تصمیم، سند توسعه، تغییر کد، تست، خطا، دلیل تصمیم و نتیجه اجرا در حافظه همان پروژه ثبت شود.

بازبینی workflowهای فعلی n8n نشان داد که prototype فعلی ارزشمند است، اما n8n در چند workflow نقش backend، schema owner، persistence layer و state machine را گرفته است. این وضعیت برای proof-of-concept مفید بوده، اما برای RecallHub قابل اتکا نیست.

تصمیم اصلاحی این نسخه:

```text
Angular  = پنل کنترل و عملیات، SPA رسمی RecallHub، مصرف‌کننده API
NestJS   = API رسمی، امنیت، مالک دیتابیس، orchestrator و state machine
n8n      = executor برای automation، LLM call، integration و تولید artifact
Postgres = source of truth فقط از مسیر NestJS/Prisma
Redis    = queue/cache/lock
Nginx    = static web server برای build تولیدی Angular و fallback مسیرهای SPA
```

در معماری نهایی، n8n خروجی structured artifact تولید می‌کند و آن را با callback امن به NestJS برمی‌گرداند. NestJS خروجی را validate می‌کند و فقط خودش در جدول‌های RecallHub می‌نویسد. اگر واقعاً هیچ روش بهتری وجود نداشت، n8n فقط اجازه نوشتن append-only در یک inbox/staging schema محدود را دارد، نه در جدول‌های اصلی دامنه.

---

## 1. هدف محصول RecallHub

RecallHub باید این سناریوها را پشتیبانی کند:

1. تعریف پروژه واقعی با مشخصات دقیق:
   - نام پروژه، کد پروژه، توضیح پروژه
   - framework و version؛ مثل `Odoo 19`
   - زبان‌ها و فایل‌تایپ‌های مهم؛ مثل `python`, `js`, `xml`, `json`
   - مسیر repository یا مسیر mount شده داخل container
   - فایل‌های تنظیمات؛ مثل `odoo.conf`, `requirements.txt`, `.env.example`
   - app/moduleهای اصلی framework
   - app/moduleهای نوشته‌شده توسط تیم
   - app/moduleهای third-party یا vendor

2. ساخت حافظه قابل جستجو از پروژه:
   - ساختار پروژه
   - moduleها، فایل‌ها، manifestها، configها
   - تصمیم‌های قبلی
   - کارهای انجام‌شده
   - دلیل هر تغییر
   - نتیجه validation و تست
   - سندهای توسعه و handover

3. اجرای چرخه کار توسعه:
   - دریافت درخواست کاربر
   - تحقیق و discovery در صورت نیاز
   - تولید سند توسعه
   - review سند
   - گرفتن approval انسانی
   - اجرای تغییر یا آماده‌سازی دستور اجرای تغییر
   - ثبت memory commit شامل چه کاری، چرا، چطور، روی چه فایل‌هایی و با چه نتیجه‌ای

4. جلوگیری از حدس و ثبت حقیقت قابل ردیابی:
   - هیچ default مخفی برای project، repoRoot، framework یا version مجاز نیست.
   - داده‌های auto-detected فقط با status=`suggested` ثبت می‌شوند تا کاربر آن‌ها را تأیید کند.
   - LLM اگر چیزی را نمی‌داند باید `unknown` یا `needs_user_input` برگرداند، نه پاسخ حدسی.
   - اجرای implementation تا زمان رفع سؤال‌های باز یا waiver صریح انسانی مجاز نیست.

---

## 2. یافته‌های مهم از workflowهای فعلی n8n

### 2.1 وضعیت فعلی workflowها

| Workflow | وضعیت فعلی | مشکل اصلی | تصمیم اصلاحی |
|---|---:|---|---|
| `WF0_User_Message_To_Final_Document` | inactive | orchestrator طولانی، وابستگی به `localhost:5678`، call مستقیم workflowهای دیگر | orchestration به NestJS منتقل شود؛ WF0 فقط legacy/dev باقی بماند. |
| `WF1_Project_Memory_Sync` | active | schema creation، SQL string building، write مستقیم به project tables، scan filesystem داخل n8n، default repoRoot، parsing manifest با `Function` | تبدیل به scanner artifact producer یا انتقال scan به NestJS worker؛ persistence فقط در NestJS. |
| `WF2_Task_Intake_Analysis` | active | ensure schema، read/write conversation/draft، اتصال LLM و persistence در یک workflow | NestJS context را آماده کند؛ n8n فقط analysis artifact بسازد. |
| `WF3_Draft_To_Ready_Approval` | active | تولید brief خوب است اما ready_task را n8n ذخیره می‌کند | n8n سه artifact برگرداند؛ NestJS ready task را بسازد. |
| `WF3B_Document_Review_Pipeline` | active | review چندنقشی ارزشمند است اما reviewها را n8n ذخیره می‌کند | n8n review artifact برگرداند؛ NestJS ذخیره کند. |
| `WF3C_Final_Document_Consolidation` | active | final document را n8n ذخیره می‌کند | n8n markdown + metadata برگرداند؛ NestJS ذخیره کند. |
| `WF3D_Document_Revision_Loop` | inactive | revision مستقیم در DB | پشت approval policy فعال شود؛ persistence در NestJS. |
| `WF3E_Human_Review_Gate` | active | action انسانی در n8n ثبت می‌شود | human decision فقط از API NestJS ثبت شود. |
| `WF3F_Document_Orchestration_Controller` | inactive | state machine در n8n | state machine کامل در NestJS. |
| `WF3G_Status_Dashboard` | inactive | read model در n8n | reporting/read model در NestJS. |
| `WF4_Execution_Run` | active | execution فقط stub است اما در DB اجرا می‌نویسد | به‌صورت `execution_simulation` نگه داشته شود؛ اجرای واقعی بعداً طراحی شود. |

### 2.2 ریسک‌های قطعی پیدا شده

1. n8n در چند workflow `CREATE TABLE`, `ALTER TABLE`, `INSERT`, `UPDATE` اجرا می‌کند.
2. SQLها داخل Code node با string concatenation ساخته می‌شوند.
3. `WF1` برای `projectCode`, `projectName`, `repoRoot`, `targetOdooVersion` مقدار default دارد؛ این خلاف اصل «بدون حدس» است.
4. `WF1` از `repoRoot` برای دسترسی filesystem استفاده می‌کند؛ اگر allowlist نشود خطر دسترسی ناخواسته به filesystem وجود دارد.
5. `WF1` برای parsing فایل `__manifest__.py` از `Function(...)` استفاده می‌کند؛ این الگو برای فایل repository قابل اعتماد نیست و ریسک code execution دارد.
6. `WF0` چند URL داخلی را با `http://localhost:5678` hard-code کرده است؛ در Docker/production می‌شکند.
7. promptها داخل workflow/code nodeها هستند و versioning دقیق ندارند.
8. workflowهای طولانی synchronous هستند؛ timeout، retry و user experience را مشکل می‌کنند.
9. final document با execution approval یکی نیست؛ باید human gate و state transition جدا داشته باشد.
10. Angular web UI نباید به n8n مستقیم وصل شود؛ تمام actionها باید از NestJS عبور کنند.

---

## 3. تصمیم‌های قطعی معماری

### 3.1 مالکیت داده

```text
NestJS/Prisma = مالک تمام جدول‌های دامنه RecallHub
n8n           = تولیدکننده artifact، نه مالک persistence
Angular       = مصرف‌کننده API، نه writer مستقیم DB
```

### 3.2 قانون ممنوعیت write مستقیم n8n

در production، n8n نباید هیچ privilege برای `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, `DROP` روی schemaهای دامنه داشته باشد.

Schemaهای دامنه:

```text
recallhub_core
recallhub_memory
recallhub_work
recallhub_audit
```

نقش n8n:

```text
n8n may call NestJS HTTP endpoints.
n8n may write only to its own n8n_db.
n8n must not write to recallhub_* domain tables.
```

### 3.3 استثنای بسیار محدود برای وقتی هیچ راه بهتری وجود ندارد

استثنا فقط وقتی مجاز است که هر سه گزینه زیر عملی نباشند:

1. callback مستقیم n8n به NestJS
2. upload artifact به object storage و ارسال reference به NestJS
3. ارسال message به queue کنترل‌شده که NestJS consumer آن باشد

اگر هر سه گزینه رد شد، n8n فقط می‌تواند در schema زیر append-only بنویسد:

```text
recallhub_inbox.n8n_artifact_inbox
```

قوانین این exception:

```text
[اجباری] نیازمند ADR با دلیل فنی است.
[اجباری] فقط INSERT مجاز است.
[اجباری] UPDATE/DELETE ممنوع است.
[اجباری] artifact تا قبل از validation توسط NestJS حقیقت محسوب نمی‌شود.
[اجباری] constraint روی run_id، workflow_code و signature وجود دارد.
[اجباری] payload size limit دارد.
[اجباری] retention policy دارد.
```

پیشنهاد پیش‌فرض برای MVP: از همین استثنا هم استفاده نشود. callback امن HTTP کافی است.

---

## 4. معماری هدف RecallHub

```text
                         +----------------------+
                         |        Angular       |
                         |  Web Control Plane   |
                         +----------+-----------+
                                    |
                                    | HTTPS REST / JWT / API Key
                                    v
+----------------------+  +---------+----------+  signed webhook/callback  +----------------------+
| PostgreSQL           |<-|       NestJS       |<------------------------>|         n8n          |
| recallhub_db         |  | Domain + API       |                          | Automation Executor  |
+----------+-----------+  +---------+----------+                          +----------+-----------+
           ^                         |                                                |
           |                         v                                                v
           |                 +-------+--------+                              +---------+---------+
           |                 | Redis / Queue  |                              | LLM / APIs        |
           |                 +----------------+                              +-------------------+
           |
           | فقط NestJS/Prisma
           v
      RecallHub Tables
```

### 4.1 جریان اجرای استاندارد

```text
1. کاربر در Angular web UI action را اجرا می‌کند.
2. Angular فقط NestJS API را صدا می‌زند.
3. NestJS auth, permission, validation, project state و idempotency را بررسی می‌کند.
4. NestJS یک WorkflowRun می‌سازد.
5. NestJS n8n را با payload signed صدا می‌زند.
6. n8n فقط کار automation/LLM/integration را انجام می‌دهد.
7. n8n output structured را با callback signed به NestJS می‌فرستد.
8. NestJS output را validate و normalize می‌کند.
9. NestJS در دیتابیس می‌نویسد و audit/event ثبت می‌کند.
10. Angular وضعیت را از NestJS می‌خواند.
```

### 4.2 جریان project sync جدید

```text
Angular -> NestJS /projects/:code/sync
NestJS validates project repository/profile
NestJS creates SyncRun
NestJS triggers Scanner job
Scanner reads repo from allowlisted mount
Scanner returns ProjectScanArtifact
NestJS validates artifact
NestJS persists modules/files/chunks
NestJS emits MemoryEvent(project.synced)
```

Scanner می‌تواند داخل NestJS worker باشد. اگر به n8n سپرده شد، n8n فقط `ProjectScanArtifact` برمی‌گرداند و هیچ DB write ندارد.

---

## 5. تعریف پروژه در RecallHub

### 5.1 Project Profile

هر پروژه در RecallHub باید profile explicit داشته باشد. مقدار default مخفی مجاز نیست.

فیلدهای اصلی:

```text
id                      uuid internal
project_code            unique, human-readable, uppercase slug
name                    display name
description             توضیح پروژه به زبان کاربر
business_domain          ERP, CRM, ecommerce, internal-tool, etc.
status                  draft | configured | indexed | active | paused | archived
owner_id                user id
primary_framework_name   مثل odoo, nestjs, django, react
primary_framework_version مثل 19, 10, 5.0
created_at
updated_at
```

قانون:

```text
project_code، name، description، primary_framework_name، primary_framework_version باید explicit باشند.
اگر کاربر آن‌ها را نداده باشد، API باید VALIDATION_ERROR برگرداند.
```

### 5.2 Tech Stack

تکنولوژی‌ها جدا از Project نگهداری می‌شوند تا یک پروژه چند framework/language داشته باشد.

```text
rh_project_tech_stack
  id
  project_id
  category            framework | language | runtime | database | package_manager | test_tool | build_tool | integration
  name                python, javascript, xml, postgresql, odoo, nodejs
  version             19, 3.12, 22, etc.
  source              declared | detected | imported
  confidence          0..1 فقط برای detected
  status              active | suggested | rejected | deprecated
  notes
  created_at
  updated_at
```

قانون عدم حدس:

```text
source=declared فقط از فرم کاربر یا API معتبر می‌آید.
source=detected هیچ‌وقت جای declared را نمی‌گیرد.
detected item تا قبل از approval، status=suggested دارد.
```

### 5.3 Repository Binding

کاربر باید بتواند مسیر پروژه را بدهد، اما مسیر فقط بعد از validation قابل استفاده است.

```text
rh_project_repositories
  id
  project_id
  repo_name
  locator_type          local_path | git_url | docker_volume | network_share
  repo_root             مسیر canonical داخل محیط execution، نه هر path خام کاربر
  host_path_hash        optional برای audit بدون افشای مسیر کامل
  default_branch
  current_branch
  commit_sha
  is_primary
  status                pending_validation | valid | invalid | disabled
  validation_errors_json
  created_at
  updated_at
```

قوانین امنیت مسیر:

```text
repo_root must be resolved by RepositoryPathResolver in NestJS.
repo_root must start with one allowed root.
parent traversal ممنوع است.
symlink escape ممنوع است.
absolute path خام از user بدون mapping پذیرفته نمی‌شود.
container mount برای repoها read-only است.
```

متغیر محیطی نمونه:

```text
ALLOWED_REPO_ROOTS=/workspace/repos,/mnt/project-repos
```

### 5.4 Project Structure Profile

برای پروژه‌هایی مثل Odoo باید بتوانیم ساختار را دقیق تعریف کنیم.

```text
rh_project_paths
  id
  project_id
  repository_id
  path
  path_type             framework_core | official_addons | custom_addons | owned_apps | third_party_apps | config | docs | tests | scripts | generated | ignore
  label
  is_required
  scan_policy           include | exclude | metadata_only
  ownership             framework | vendor | team_owned | generated | unknown
  created_at
  updated_at
```

نمونه path_type برای Odoo:

```text
framework_core     مسیر core خود Odoo
official_addons  addons رسمی Odoo
custom_addons      addonهای سفارشی قابل بررسی
owned_apps         addonهایی که تیم خودتان نوشته است
third_party_apps   addonهای خریداری‌شده یا vendor
config             فایل‌ها و پوشه‌های تنظیمات
ignore             مسیرهایی که نباید scan یا به LLM ارسال شوند
```

### 5.5 Project Config Files

```text
rh_project_config_files
  id
  project_id
  repository_id
  relative_path
  config_type       odoo_conf | env_example | requirements | package_json | manifest | docker_compose | other
  required
  contains_secrets  true | false | unknown
  scan_policy       metadata_only | parse_safe | exclude
```

قانون:

```text
فایل‌هایی که contains_secrets=true یا unknown هستند نباید raw به LLM ارسال شوند.
```

---

## 6. مثال قطعی: تعریف پروژه Vodoo روی Odoo 19

### 6.1 فرم ایجاد پروژه

```json
{
  "project_code": "VODOO",
  "name": "Vodoo",
  "description": "پروژه Odoo 19 برای مدیریت سفارشی‌سازی‌های ERP شرکت.",
  "business_domain": "ERP",
  "primary_framework": {
    "name": "odoo",
    "version": "19"
  },
  "tech_stack": [
    { "category": "language", "name": "python", "version": null, "source": "declared" },
    { "category": "language", "name": "javascript", "version": null, "source": "declared" },
    { "category": "language", "name": "xml", "version": null, "source": "declared" },
    { "category": "language", "name": "json", "version": null, "source": "declared" },
    { "category": "framework", "name": "odoo", "version": "19", "source": "declared" }
  ],
  "repository": {
    "repo_name": "vodoo-main",
    "locator_type": "local_path",
    "repo_root": "/workspace/repos/vodoo",
    "default_branch": "main"
  },
  "paths": [
    { "path": "odoo", "path_type": "framework_core", "ownership": "framework", "scan_policy": "metadata_only" },
    { "path": "addons", "path_type": "official_addons", "ownership": "framework", "scan_policy": "metadata_only" },
    { "path": "custom-addons", "path_type": "custom_addons", "ownership": "team_owned", "scan_policy": "include" },
    { "path": "vodoo-addons", "path_type": "owned_apps", "ownership": "team_owned", "scan_policy": "include" },
    { "path": "third-party-addons", "path_type": "third_party_apps", "ownership": "vendor", "scan_policy": "metadata_only" },
    { "path": "venv", "path_type": "ignore", "ownership": "generated", "scan_policy": "exclude" },
    { "path": ".git", "path_type": "ignore", "ownership": "generated", "scan_policy": "exclude" }
  ],
  "config_files": [
    { "relative_path": "odoo.conf", "config_type": "odoo_conf", "required": true, "contains_secrets": "unknown", "scan_policy": "metadata_only" },
    { "relative_path": "requirements.txt", "config_type": "requirements", "required": false, "contains_secrets": false, "scan_policy": "parse_safe" },
    { "relative_path": "docker-compose.yml", "config_type": "docker_compose", "required": false, "contains_secrets": "unknown", "scan_policy": "metadata_only" }
  ]
}
```

### 6.2 نتیجه مورد انتظار بعد از create

```json
{
  "success": true,
  "data": {
    "project_code": "VODOO",
    "status": "configured",
    "next_step": "run_initial_sync"
  }
}
```

اگر مسیر repository خارج از allowlist باشد:

```json
{
  "success": false,
  "error": {
    "code": "REPO_ROOT_NOT_ALLOWED",
    "message": "Repository root is outside configured allowed roots.",
    "details": {
      "repo_root": "/some/raw/path",
      "allowed_roots": ["/workspace/repos", "/mnt/project-repos"]
    }
  }
}
```

---

## 7. حافظه پروژه: چه چیزهایی باید یاد بماند؟

RecallHub نباید فقط فایل‌ها را index کند. باید history واقعی کار را نگه دارد.

### 7.1 انواع حافظه

```text
ProjectStaticMemory
  ساختار پروژه، تکنولوژی‌ها، moduleها، configها، قراردادهای کدنویسی

ProjectDynamicMemory
  کارهای انجام‌شده، تصمیم‌ها، دلایل، تغییرات، validationها، خطاها

WorkItemMemory
  مسیر کامل یک درخواست: user request -> analysis -> research -> document -> approval -> implementation -> validation -> memory commit

DecisionMemory
  ADRها، دلیل انتخاب‌ها، alternativeهای ردشده، trade-offها

ArtifactMemory
  سند توسعه، reviewها، final document، test plan، handover، خروجی LLM
```

### 7.2 Memory Event immutable

هر عملیات مهم باید event append-only بسازد.

```text
rh_memory_events
  id
  project_id
  work_item_id
  event_type
  actor_id
  reason
  summary
  before_json
  after_json
  artifact_id
  created_at
```

قانون:

```text
MemoryEvent و AuditLog قابل ویرایش نیستند.
اگر اشتباهی ثبت شد، correction event ثبت می‌شود.
```

### 7.3 Memory Commit بعد از هر کار

وقتی کاری انجام شد، یک memory commit باید ساخته شود:

```text
rh_memory_commits
  id
  project_id
  work_item_id
  title
  what_changed
  why_changed
  how_changed
  files_touched_json
  modules_touched_json
  commands_run_json
  validation_result_json
  risks_remaining_json
  created_by
  created_at
```

هر memory commit باید به artifactها و workflow runs مربوط لینک شود.

---

## 8. چرخه کاری اصلی RecallHub

### 8.1 WorkItem state machine

```text
draft
  -> needs_project_context
  -> needs_research
  -> research_in_progress
  -> research_ready
  -> spec_drafting
  -> spec_review
  -> needs_human_approval
  -> approved_for_implementation
  -> implementation_planning
  -> implementation_in_progress
  -> validation_in_progress
  -> done_pending_memory_commit
  -> completed
```

وضعیت‌های خطا/توقف:

```text
blocked
rejected
cancelled
failed
superseded
```

### 8.2 قانون اجرای implementation

هیچ implementation واقعی نباید فقط با داشتن `final_document_markdown` شروع شود.

برای شروع implementation باید این‌ها برقرار باشد:

```text
[اجباری] Project status = active یا indexed
[اجباری] WorkItem status = approved_for_implementation
[اجباری] latest final document exists
[اجباری] human approval exists
[اجباری] open_questions empty یا waiver ثبت شده
[اجباری] risk level مجاز باشد
[اجباری] branch/working tree policy مشخص باشد
```

### 8.3 Research-first flow برای ساخت پروژه یا feature جدید

```text
User Request
  -> WorkItem created
  -> ResearchPlan generated
  -> ResearchRun executed
  -> ResearchFindings artifact
  -> DevelopmentSpec draft
  -> Multi-role review
  -> Final Development Document
  -> Human approval
  -> ImplementationPlan
  -> Execution/manual coding/agent coding
  -> Validation
  -> MemoryCommit
```

### 8.4 خروجی سند توسعه باید شامل این بخش‌ها باشد

```text
1. هدف و دامنه
2. context پروژه و محدودیت‌ها
3. requirementهای functional
4. requirementهای non-functional
5. impact analysis روی moduleها و فایل‌ها
6. architecture/design
7. data model changes
8. API changes
9. UI/Admin changes
10. workflow/automation changes
11. migration/backward compatibility
12. security considerations
13. test plan
14. rollout plan
15. risks and mitigations
16. acceptance criteria
17. unresolved questions
```

---

## 9. مدل داده پیشنهادی

### 9.1 Schemaها

```text
recallhub_core       پروژه، کاربر، role، permission، tech stack، repo binding
recallhub_memory     module/file/chunk/memory event/memory commit
recallhub_work       work item، سندها، reviewها، approvalها، executionها
recallhub_workflow   workflow definition/run/event/artifact
recallhub_audit      audit log و security event
recallhub_inbox      فقط exception append-only برای artifact inbox، در صورت نیاز
n8n                  دیتابیس داخلی n8n
web                  Angular/Nginx static frontend، بدون دیتابیس دامنه
```

### 9.2 جدول‌های core

```text
rh_projects
  id uuid pk
  project_code text unique not null
  name text not null
  description text not null
  business_domain text
  status project_status not null
  primary_framework_name text not null
  primary_framework_version text not null
  owner_id uuid
  metadata_json jsonb
  created_at timestamptz
  updated_at timestamptz

rh_project_tech_stack
  id uuid pk
  project_id uuid fk
  category text not null
  name text not null
  version text
  source tech_source not null
  confidence numeric
  status tech_status not null
  notes text
  created_at timestamptz
  updated_at timestamptz

rh_project_repositories
  id uuid pk
  project_id uuid fk
  repo_name text not null
  locator_type text not null
  repo_root text not null
  default_branch text
  current_branch text
  commit_sha text
  is_primary boolean
  status repo_status not null
  validation_errors_json jsonb
  created_at timestamptz
  updated_at timestamptz

rh_project_paths
  id uuid pk
  project_id uuid fk
  repository_id uuid fk
  path text not null
  path_type text not null
  label text
  is_required boolean
  scan_policy text not null
  ownership text not null
  created_at timestamptz
  updated_at timestamptz
```

### 9.3 جدول‌های memory

```text
rh_project_modules
  id uuid pk
  project_id uuid fk
  repository_id uuid fk
  module_name text not null
  module_path text not null
  module_type text not null
  ownership text not null
  manifest_json jsonb
  depends_json jsonb
  summary text
  source_status declared | discovered | confirmed | ignored
  is_active boolean
  last_sync_run_id uuid
  created_at timestamptz
  updated_at timestamptz

rh_project_files
  id uuid pk
  project_id uuid fk
  repository_id uuid fk
  module_id uuid nullable
  file_path text not null
  file_name text not null
  file_ext text
  file_kind text
  file_size_bytes bigint
  content_hash text
  scan_policy text
  contains_secrets boolean
  is_active boolean
  last_sync_run_id uuid
  metadata_json jsonb
  created_at timestamptz
  updated_at timestamptz

rh_memory_chunks
  id uuid pk
  project_id uuid fk
  source_type project | module | file | work_item | decision | document
  source_id uuid nullable
  chunk_key text unique not null
  chunk_type text not null
  content text not null
  embedding_ref text nullable
  sensitivity public | internal | sensitive | secret_excluded
  metadata_json jsonb
  created_at timestamptz
  updated_at timestamptz

rh_memory_events
  id uuid pk
  project_id uuid fk
  work_item_id uuid nullable
  event_type text not null
  actor_id uuid nullable
  reason text
  summary text not null
  before_json jsonb
  after_json jsonb
  artifact_id uuid nullable
  created_at timestamptz

rh_memory_commits
  id uuid pk
  project_id uuid fk
  work_item_id uuid fk
  title text not null
  what_changed text not null
  why_changed text not null
  how_changed text not null
  files_touched_json jsonb
  modules_touched_json jsonb
  commands_run_json jsonb
  validation_result_json jsonb
  risks_remaining_json jsonb
  created_by uuid
  created_at timestamptz
```

### 9.4 جدول‌های work/document

```text
rh_work_items
  id uuid pk
  project_id uuid fk
  title text not null
  original_request text not null
  request_type research | development_spec | implementation | debugging | refactor | documentation | operations
  status work_item_status not null
  risk_level low | medium | high | critical
  priority low | normal | high | urgent
  requested_by uuid nullable
  assigned_to uuid nullable
  open_questions_json jsonb
  metadata_json jsonb
  created_at timestamptz
  updated_at timestamptz

rh_artifacts
  id uuid pk
  project_id uuid fk
  work_item_id uuid nullable
  artifact_type research_plan | research_findings | development_spec | review | final_document | implementation_plan | validation_report | handover | scan_result
  title text not null
  content_markdown text
  content_json jsonb
  source workflow | human | imported | system
  status draft | under_review | approved | rejected | superseded
  version int
  hash text
  created_by uuid nullable
  created_at timestamptz
  updated_at timestamptz

rh_document_reviews
  id uuid pk
  project_id uuid fk
  work_item_id uuid fk
  artifact_id uuid fk
  reviewer_role text not null
  decision approved | approved_with_minor_changes | revise | blocked
  score int
  notes_md text
  blockers_json jsonb
  warnings_json jsonb
  created_at timestamptz

rh_human_approvals
  id uuid pk
  project_id uuid fk
  work_item_id uuid fk
  artifact_id uuid nullable
  decision approved_for_research | approved_for_spec | approved_for_implementation | needs_revision | rejected
  reviewed_by uuid not null
  review_note text
  created_at timestamptz

rh_decisions
  id uuid pk
  project_id uuid fk
  work_item_id uuid nullable
  title text not null
  context text not null
  decision text not null
  alternatives_json jsonb
  consequences text
  status proposed | accepted | rejected | superseded
  created_by uuid
  created_at timestamptz
```

### 9.5 جدول‌های workflow

```text
rh_workflow_definitions
  id uuid pk
  code text unique not null
  name text not null
  executor n8n | internal_worker | manual
  n8n_path text nullable
  input_schema_json jsonb
  output_schema_json jsonb
  active boolean
  created_at timestamptz
  updated_at timestamptz

rh_workflow_runs
  id uuid pk
  workflow_definition_id uuid fk
  project_id uuid nullable
  work_item_id uuid nullable
  status pending | queued | running | succeeded | failed | cancelled | retrying | timed_out | callback_missing
  input_json jsonb
  output_json jsonb
  error_json jsonb
  n8n_execution_id text nullable
  idempotency_key text nullable
  triggered_by uuid nullable
  started_at timestamptz nullable
  finished_at timestamptz nullable
  created_at timestamptz
  updated_at timestamptz

rh_workflow_events
  id uuid pk
  workflow_run_id uuid fk
  event_type text not null
  payload_json jsonb
  created_at timestamptz
```

---

## 10. APIهای NestJS

### 10.1 اصول API

```text
Base path: /api/v1
Auth: JWT برای کاربر، API Key/HMAC برای سرویس داخلی
Validation: DTO + Zod/Joi/class-validator
Audit: اجباری برای هر write/action
Idempotency: برای actionهای workflow و sync
Pagination: page/limit/sort/filter
```

### 10.2 Projects

```http
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:projectCode
PATCH  /api/v1/projects/:projectCode
POST   /api/v1/projects/:projectCode/archive
```

### 10.3 Tech stack و ساختار پروژه

```http
GET    /api/v1/projects/:projectCode/tech-stack
POST   /api/v1/projects/:projectCode/tech-stack
PATCH  /api/v1/projects/:projectCode/tech-stack/:id
POST   /api/v1/projects/:projectCode/tech-stack/:id/approve-detected
POST   /api/v1/projects/:projectCode/tech-stack/:id/reject-detected

GET    /api/v1/projects/:projectCode/repositories
POST   /api/v1/projects/:projectCode/repositories
POST   /api/v1/projects/:projectCode/repositories/:repoId/validate

GET    /api/v1/projects/:projectCode/paths
POST   /api/v1/projects/:projectCode/paths
PATCH  /api/v1/projects/:projectCode/paths/:pathId
DELETE /api/v1/projects/:projectCode/paths/:pathId

GET    /api/v1/projects/:projectCode/config-files
POST   /api/v1/projects/:projectCode/config-files
PATCH  /api/v1/projects/:projectCode/config-files/:id
```

### 10.4 Sync و حافظه پروژه

```http
POST   /api/v1/projects/:projectCode/sync
GET    /api/v1/projects/:projectCode/sync-runs
GET    /api/v1/projects/:projectCode/modules
GET    /api/v1/projects/:projectCode/files
GET    /api/v1/projects/:projectCode/memory-chunks
GET    /api/v1/projects/:projectCode/memory-events
GET    /api/v1/projects/:projectCode/memory-commits
GET    /api/v1/projects/:projectCode/search-memory
```

### 10.5 Work items و چرخه توسعه

```http
GET    /api/v1/projects/:projectCode/work-items
POST   /api/v1/projects/:projectCode/work-items
GET    /api/v1/work-items/:workItemId
PATCH  /api/v1/work-items/:workItemId
POST   /api/v1/work-items/:workItemId/analyze
POST   /api/v1/work-items/:workItemId/start-research
POST   /api/v1/work-items/:workItemId/generate-development-spec
POST   /api/v1/work-items/:workItemId/review-document
POST   /api/v1/work-items/:workItemId/finalize-document
POST   /api/v1/work-items/:workItemId/human-approval
POST   /api/v1/work-items/:workItemId/create-implementation-plan
POST   /api/v1/work-items/:workItemId/complete-memory-commit
GET    /api/v1/work-items/:workItemId/status
GET    /api/v1/work-items/:workItemId/artifacts
```

### 10.6 Workflow runها

```http
GET    /api/v1/workflows
POST   /api/v1/workflows/:code/run
GET    /api/v1/workflow-runs
GET    /api/v1/workflow-runs/:runId
GET    /api/v1/workflow-runs/:runId/events
POST   /api/v1/workflow-runs/:runId/retry
POST   /api/v1/workflow-runs/:runId/cancel
```

### 10.7 n8n callback

```http
POST /api/v1/integrations/n8n/callback
POST /api/v1/integrations/n8n/execution-update
GET  /api/v1/integrations/n8n/health
```

Callback payload:

```json
{
  "runId": "uuid",
  "workflowCode": "document.review",
  "status": "succeeded",
  "n8nExecutionId": "12345",
  "artifact": {
    "type": "document_review",
    "contentJson": {}
  },
  "error": null
}
```

---

## 11. قرارداد جدید n8n

### 11.1 payload trigger استاندارد

```json
{
  "runId": "uuid",
  "workflowCode": "project.scan",
  "projectCode": "VODOO",
  "actorId": "uuid",
  "input": {},
  "context": {
    "project": {},
    "workItem": {},
    "memorySnapshot": {}
  },
  "callbackUrl": "https://api.example.com/api/v1/integrations/n8n/callback",
  "requestedAt": "2026-04-28T00:00:00.000Z"
}
```

### 11.2 قانون خروجی n8n

n8n باید یکی از این artifactها را برگرداند:

```text
ProjectScanArtifact
TaskAnalysisArtifact
ResearchFindingsArtifact
DevelopmentSpecArtifact
DocumentReviewArtifact
FinalDocumentArtifact
RevisionArtifact
ImplementationPlanArtifact
ValidationReportArtifact
ExecutionSimulationArtifact
```

n8n نباید این کارها را بکند:

```text
[ممنوع] CREATE TABLE / ALTER TABLE
[ممنوع] INSERT/UPDATE/DELETE روی recallhub_* domain schemas
[ممنوع] ساختن state transition نهایی
[ممنوع] گرفتن تصمیم permission
[ممنوع] قبول repoRoot خام و arbitrary
[ممنوع] اجرای کد از داخل فایل‌های repo مانند Function/eval
```

### 11.3 امضای callback

Headerها:

```text
X-RecallHub-Timestamp: unix timestamp
X-RecallHub-Run-Id: uuid
X-RecallHub-Signature: hmac_sha256(timestamp + "." + runId + "." + rawBody, N8N_CALLBACK_SECRET)
```

Validation در NestJS:

```text
timestamp skew <= 5 minutes
constant-time signature compare
runId exists
workflowCode matches run
callback nonce not replayed
status transition allowed
artifact validates against schema
```

---

## 12. Refactor لازم برای workflowهای فعلی

### 12.1 WF1 Project Memory Sync

حذف شود:

```text
DB_EnsureMemorySchema
DB_StartSyncRun
DB_UpsertProject
DB_UpsertModules
DB_UpsertFiles
DB_UpsertChunks
DB_FinalizeSyncRun
Code_BuildPersistenceQueries
Code_BuildFinalizeQuery
```

جایگزین شود با:

```text
IN_Webhook
Validate signed payload
Scan repository from resolved repoRoot supplied by NestJS
Build ProjectScanArtifact
POST callback to NestJS
Respond accepted/succeeded
```

اصلاحات امنیتی واجب:

```text
[اجباری] حذف default projectCode/projectName/repoRoot/targetOdooVersion
[اجباری] repoRoot فقط از NestJS context می‌آید، نه user raw payload
[اجباری] حذف Function/eval برای parse manifest
[اجباری] skip symlink یا validate symlink داخل repoRoot
[اجباری] file size limit
[اجباری] max file count و max total bytes
[اجباری] secret redaction قبل از ساخت chunk
```

### 12.2 WF2 Task Intake Analysis

حذف شود:

```text
DB_EnsureAnalysisSchema
DbUpsertConversation
DbSaveConversationMessage
DbSaveDraftTask
هر DB write دیگر
```

NestJS باید قبل از trigger این context را آماده کند:

```text
project profile
tech stack
relevant modules/files/chunks
recent conversation summary
work item metadata
```

n8n فقط برگرداند:

```text
TaskAnalysisArtifact
  title
  summary
  affected areas
  risks
  open questions
  recommendation
  confidence
```

### 12.3 WF3/WF3B/WF3C/WF3D

این workflowها برای تولید سند، review، consolidation و revision مفیدند. تغییر لازم:

```text
هر DB load/write حذف شود.
NestJS packet کامل را به n8n بدهد.
n8n فقط artifact structured برگرداند.
NestJS artifact را ذخیره کند و state transition بدهد.
```

### 12.4 WF3E Human Review Gate

این workflow در معماری جدید لازم نیست. تصمیم انسانی باید فقط از API NestJS ثبت شود.

```text
POST /api/v1/work-items/:id/human-approval
```

### 12.5 WF3F Document Orchestration Controller

منطق آن باید در `DocumentPipelineService` یا `WorkItemStateMachine` داخل NestJS پیاده‌سازی شود.

### 12.6 WF3G Status Dashboard

read model و dashboard API باید در NestJS باشد. n8n برای reporting لازم نیست.

### 12.7 WF4 Execution Run

تا وقتی executor واقعی نداریم، نام و API باید صریح باشد:

```text
execution.simulate
Execution Simulation
Stub Execution
```

خروجی آن نباید به عنوان تغییر واقعی کد ثبت شود. اگر بعدها executor واقعی اضافه شد، طراحی جدا لازم دارد:

```text
sandbox
branch policy
diff review
test runner
rollback plan
human approval
```

---

## 13. امنیت repository scanning

### 13.1 Path Resolver

NestJS باید سرویس زیر را داشته باشد:

```text
RepositoryPathResolver
  input: project repository id
  output: canonical repo_root inside allowed mount
```

قوانین:

```text
realpath(repo_root) must start with realpath(ALLOWED_REPO_ROOT)
path traversal ممنوع
symlink escape ممنوع
hidden sensitive paths exclude
repo mount read-only
```

### 13.2 Manifest parser امن برای Odoo

الگوی فعلی `Function('return (...)')()` ممنوع است.

گزینه‌های مجاز:

```text
1. parser مبتنی بر Python ast.literal_eval در worker sandbox شده
2. parser محدود JS که فقط literal dict/list/string/number/bool/null را قبول کند
3. استفاده از subprocess جدا با timeout و no network و read-only filesystem
```

قانون:

```text
اگر manifest شامل expression، import، function call، variable reference یا کد اجرایی بود، parse باید fail شود و warning ثبت شود.
```

### 13.3 Secret redaction

قبل از ارسال هر context به LLM:

```text
.env, *.pem, *.key, credentials, passwords, tokens exclude
فایل config با contains_secrets=unknown فقط metadata_only
regex redaction برای token/password/secret/api_key
content hash ذخیره شود ولی secret content ذخیره نشود
```

### 13.4 محدودیت‌های scan

```text
MAX_FILES_PER_SYNC=20000
MAX_FILE_SIZE_BYTES=1048576
MAX_TOTAL_BYTES_PER_SYNC=200MB
EXCLUDED_DIRS=.git,node_modules,venv,.venv,__pycache__,dist,build,.mypy_cache,.pytest_cache
ALLOWED_EXTENSIONS=.py,.xml,.js,.ts,.json,.yml,.yaml,.csv,.md,.rst,.txt,.sql,.scss,.css
BINARY_FILES=metadata_only یا exclude
```

---

## 14. جلوگیری از حدس در تحلیل و تولید سند

### 14.1 Input contract سخت‌گیرانه

این فیلدها در create project اجباری‌اند:

```text
project_code
name
description
primary_framework.name
primary_framework.version
repository.repo_root یا git_url
حداقل یک tech_stack item
حداقل یک project_path با scan_policy=include یا metadata_only
```

### 14.2 Unknown handling

در تمام خروجی‌های AI:

```json
{
  "known_facts": [],
  "assumptions": [],
  "unknowns": [],
  "open_questions": [],
  "requires_user_input": true
}
```

قانون:

```text
assumption هیچ‌وقت به‌عنوان fact ذخیره نمی‌شود.
unknown باعث block شدن implementation می‌شود، مگر waiver انسانی ثبت شود.
```

### 14.3 Waiver انسانی

اگر کاربر بخواهد با وجود سؤال باز ادامه دهد:

```text
rh_human_approvals.decision = approved_with_waiver
review_note باید دلیل waiver را داشته باشد.
AuditLog باید ثبت شود.
WorkItem risk_level حداقل یک سطح افزایش می‌یابد.
```

---

## 15. Security design

### 15.1 RBAC پیشنهادی

```text
admin
project_owner
architect
developer
reviewer
operator
viewer
```

### 15.2 Permissionها

```text
project.read
project.create
project.update
project.archive
project.configure_repository
project.sync

memory.read
memory.write
memory.commit

work_item.read
work_item.create
work_item.update
work_item.analyze
work_item.research
work_item.generate_spec
work_item.review
work_item.approve
work_item.implement
work_item.validate

workflow.read
workflow.run
workflow.retry
workflow.cancel

audit.read
settings.write

user.read
user.manage
role.read
role.manage
```

### 15.3 Service-to-service security

```text
Angular -> NestJS: JWT/API key with restricted scope
NestJS -> n8n: internal network + signed payload
n8n -> NestJS callback: HMAC signature
Postgres: private network only
Redis: private network only
n8n UI: admin-only behind auth/IP restriction
```

### 15.3.1 تصمیم نهایی Auth و User Management

در نسخه محصولی RecallHub، صفحه Login نباید محل وارد کردن `API Base URL`، انتخاب دستی `Role` یا تعیین دستی `Actor UUID` باشد. این صفحه در prototype فقط نقش `API access/dev settings` داشته است و برای MVP توسعه مفید بوده، اما برای کنترل‌پلین واقعی کافی نیست.

تصمیم نهایی:

```text
Login UI = email یا username یا mobile + password + remember me
Register UI = ساخت حساب کاربری اولیه یا دعوت‌شده
Forgot Password UI = شروع جریان reset password
Profile UI = مشاهده/ویرایش پروفایل، عکس پروفایل، تغییر password
User Menu = نمایش نام و عکس کاربر + Profile + Logout
User Management = مدیریت userها، وضعیت حساب و role assignment
Role & Permission Management = مدیریت roleها و permissionهای دیتابیسی
```

قوانین معماری:

```text
[اجباری] role و permission از dropdown سمت frontend تعیین نمی‌شود.
[اجباری] actor_id از token/backend context می‌آید، نه input آزاد کاربر.
[اجباری] frontend فقط route guard کمکی دارد؛ authorization قطعی همیشه در NestJS انجام می‌شود.
[اجباری] password فقط salted hash ذخیره می‌شود و هرگز plain text ذخیره یا برگردانده نمی‌شود.
[اجباری] access token شامل subject، roleها و permissionها است.
[اجباری] remember me فقط طول عمر session/token را تغییر می‌دهد، نه سطح دسترسی را.
[اجباری] API key فقط برای dev/bootstrap/service-to-service مجاز است و login کاربر عادی نیست.
[اجباری] SSO/Auth0/OIDC بعداً به عنوان provider قابل اتصال طراحی می‌شود، اما مدل داخلی user/role/permission منبع authorisation داخلی RecallHub باقی می‌ماند.
```

منابع رسمی که مبنای این تصمیم هستند:

```text
NestJS Authentication: sign-in endpoint، JWT bearer token، guard و public route pattern
NestJS Authorization: RolesGuard با Reflector و اتصال نقش‌ها به request user
Angular Routing Guards: guard فقط برای navigation UX است و نباید منبع نهایی authorization باشد
Angular Reactive Forms: فرم‌های login/register/profile با model-driven forms ساخته شوند
Auth0 RBAC: role مجموعه‌ای از permissionها است، permission assignment باید least privilege باشد
Auth0 Token Best Practices: اعتبارسنجی JWT با library/middleware و توجه به algorithm/key rotation
```

### 15.3.2 صفحات و endpointهای Auth هدف

Frontend:

```text
/login
/register
/forgot-password
/profile
/admin/users
/admin/roles
```

Backend:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/forgot-password
GET  /api/v1/auth/me
PATCH /api/v1/auth/profile
POST /api/v1/auth/change-password

GET  /api/v1/admin/users
PATCH /api/v1/admin/users/:id
POST /api/v1/admin/users/:id/roles
DELETE /api/v1/admin/users/:id/roles/:roleId

GET  /api/v1/admin/roles
POST /api/v1/admin/roles
PATCH /api/v1/admin/roles/:id
GET  /api/v1/admin/permissions
POST /api/v1/admin/roles/:id/permissions
DELETE /api/v1/admin/roles/:id/permissions/:permissionId
```

### 15.3.3 مدل داده Auth هدف

```text
recallhub_core.rh_users
recallhub_core.rh_roles
recallhub_core.rh_permissions
recallhub_core.rh_user_roles
recallhub_core.rh_role_permissions
recallhub_core.rh_password_reset_requests
```

فیلدهای اصلی user:

```text
id
first_name
last_name
mobile
username
email
password_hash
avatar_url
status active | invited | suspended | disabled
last_login_at
created_at
updated_at
```

قانون migration:

```text
[اجباری] roleهای پایه و permissionهای پایه seed شوند.
[اجباری] اولین user ثبت‌نام‌شده در محیط local/dev می‌تواند admin bootstrap شود.
[اجباری] در production bootstrap admin باید با policy جدا یا invite انجام شود.
```

### 15.4 Database privilege matrix

| Principal | recallhub_core | recallhub_memory | recallhub_work | recallhub_workflow | recallhub_audit | recallhub_inbox | n8n_db |
|---|---|---|---|---|---|---|---|
| `api_user` | read/write | read/write | read/write | read/write | append/read | read/write | none |
| `migration_user` | ddl | ddl | ddl | ddl | ddl | ddl | none |
| `n8n_user` | none | none | none | none | none | none by default | read/write فقط n8n internal |
| `n8n_inbox_user` optional | none | none | none | none | none | insert-only | read/write n8n internal |
| `web_client` | none | none | none | none | none | none | none |

قانون acceptance:

```text
Integration test باید ثابت کند n8n_user نمی‌تواند روی recallhub_core.* write انجام دهد.
```

---

## 16. خطاهای برنامه‌نویسی که باید در پیاده‌سازی بسته شوند

### 16.1 SQL Injection / SQL string building

```text
[حل قطعی] persistence فقط با Prisma یا parameterized SQL در NestJS.
[حل قطعی] حذف SQL building از n8n.
[حل قطعی] n8n credential دیتابیس دامنه ندارد.
```

### 16.2 State corruption

```text
[حل قطعی] همه statusها enum هستند.
[حل قطعی] state transition فقط از serviceهای NestJS انجام می‌شود.
[حل قطعی] transition نامعتبر CONFLICT برمی‌گرداند.
```

### 16.3 Retry و duplicate execution

```text
[حل قطعی] هر action حساس Idempotency-Key دارد.
[حل قطعی] workflow runها unique idempotency constraint دارند.
[حل قطعی] callback تکراری replay محسوب می‌شود و دوباره persist نمی‌شود.
```

### 16.4 Concurrency در sync

```text
[حل قطعی] برای هر project فقط یک sync running مجاز است.
[حل قطعی] Redis lock یا Postgres advisory lock استفاده شود.
[حل قطعی] sync جدید در صورت running بودن sync قبلی 409 CONFLICT می‌گیرد.
```

### 16.5 Long-running workflow timeout

```text
[حل قطعی] workflowهای LLM و scan به شکل async اجرا شوند.
[حل قطعی] Angular polling محدود/backoff روی WorkflowRun داشته باشد.
[حل قطعی] reconciliation job runهای stuck را timed_out/callback_missing کند.
```

### 16.6 Prompt injection از فایل‌های پروژه

```text
[حل قطعی] فایل‌های پروژه untrusted context هستند.
[حل قطعی] prompt system هرگز از repo content ساخته نمی‌شود.
[حل قطعی] context با delimiter و توضیح امنیتی ارسال می‌شود.
[حل قطعی] دستورهای داخل فایل‌ها نباید توسط agent به‌عنوان instruction اجرا شوند.
```

### 16.7 Large artifact و DB bloat

```text
[حل MVP] markdown/json artifactهای معمولی در Postgres ذخیره شوند.
[حل production] artifact بزرگ در object storage ذخیره شود و hash/reference در DB بماند.
```

---

## 17. Angular web control plane plan

### 17.1 اصول frontend

```text
Framework: Angular 21
Styling: Tailwind CSS + CSS custom properties
Runtime container: Nginx static server
Base API URL: /api/v1 یا URL قابل تنظیم در UI برای توسعه local
Auth: Bearer Token یا x-recallhub-api-key محدود
State source of truth: NestJS API
Local state: فقط UI/session preferences و active ids
```

Angular مستقیم به n8n وصل نمی‌شود. Angular مستقیم به دیتابیس وصل نمی‌شود. Angular هیچ state transition دامنه‌ای را locally mutate نمی‌کند؛ بعد از هر action باید read-back از NestJS انجام شود.

مبنای رسمی Angular برای این بخش:

```text
- Angular deployment: production build با ng build و serve کردن output directory روی web server.
- Angular routed SPA: server باید برای deep linkها fallback به index.html داشته باشد.
- Angular HttpClient: provideHttpClient در app.config.ts و inject(HttpClient) در service.
- Angular routing: routeها صفحه را در RouterOutlet render می‌کنند و lazy routeها bundle را split می‌کنند.
- Angular signals: state محلی خواندنی/نوشتنی با signal/computed مدیریت می‌شود.
```

URLهای مرجع رسمی:

```text
https://angular.dev/tools/cli/deployment
https://angular.dev/guide/http/setup
https://angular.dev/guide/signals
https://angular.dev/reference/migrations/route-lazy-loading
```

### 17.2 صفحات MVP

```text
Login / API access
Project Setup Wizard
Project Memory
Work Items
Workflow Runs
Stability Dashboard
Audit Timeline
```

### 17.3 Project Setup Wizard

Stepها:

```text
1. Basic profile
2. Tech stack
3. Repository binding
4. Project paths and ownership
5. Config files
6. Sync policy
7. Review and create
```

قانون‌ها:

```text
[اجباری] project_code، name، description، framework name و framework version در UI required باشند.
[اجباری] حداقل یک tech stack item با source=declared وارد شود.
[اجباری] repository_id برای path/config از repository انتخاب‌شده بیاید، نه مقدار حدسی.
[اجباری] validate repository و sync فقط NestJS endpoint را صدا بزنند.
```

### 17.4 Work Item صفحه کار

نمایش:

```text
original request
current status
project context snapshot
open questions
research artifacts
development spec
review results
approval decision
implementation plan
validation result
memory commit
```

Actionها:

```text
Analyze
Start Research
Generate Development Spec
Run Review
Finalize Document
Submit Human Approval
Create Implementation Plan
Complete Memory Commit
```

قانون‌ها:

```text
[اجباری] actionها با status فعلی backend فعال/غیرفعال شوند.
[اجباری] اجرای lifecycle workflowهای work item از صفحه Workflow Runs ممنوع باشد و باید از endpointهای WorkItem انجام شود.
[اجباری] Human Approval gate در UI قابل دور زدن نباشد.
[اجباری] بعد از action، WorkItem list/context و WorkflowRunها دوباره fetch شوند.
```

### 17.5 Workflow Runs Monitor

```text
نمایش WorkflowDefinitionها و WorkflowRunها
نمایش events برای run انتخاب‌شده
Retry فقط برای failed/timed_out/callback_missing
Cancel فقط برای pending/queued/running/retrying
Polling محدود با backoff
جلوگیری از اجرای دستی workflowهای lifecycle مربوط به WorkItem
```

### 17.6 Stability و Audit

```text
Stability Dashboard:
  - خواندن /health/stability
  - اجرای reconcile فقط برای roleهای admin/owner/ops
  - confirm modal قبل از reconcile

Audit Timeline:
  - خواندن /audit/logs
  - ترکیب audit log و workflow runs برای timeline read-only
```

### 17.7 Build و Docker

```text
Angular build:
  npm run build

Docker:
  stage 1: node:24-alpine برای npm ci و ng build
  stage 2: nginx:1.27-alpine برای serve کردن dist/web/browser

Nginx:
  try_files $uri $uri/ /index.html;
```

قانون deployment:

```text
[اجباری] routeهای Angular باید با refresh/deep link کار کنند.
[اجباری] فایل‌های build شده static باشند؛ هیچ server-side domain write در web container وجود ندارد.
[اجباری] API key/JWT در image bake نشود و فقط توسط کاربر/محیط runtime داده شود.
```

---

## 18. NestJS module structure

```text
src/
  app.module.ts
  main.ts

  config/
    configuration.ts
    env.validation.ts

  auth/
    auth.module.ts
    jwt.strategy.ts
    api-key.guard.ts
    permissions.guard.ts

  projects/
    projects.controller.ts
    projects.service.ts
    project-tech-stack.service.ts
    project-repositories.service.ts
    project-paths.service.ts
    dto/

  repository/
    repository-path-resolver.service.ts
    repository-scan-policy.service.ts
    safe-manifest-parser.service.ts
    secret-redaction.service.ts

  memory/
    project-modules.service.ts
    project-files.service.ts
    memory-chunks.service.ts
    memory-events.service.ts
    memory-commits.service.ts
    memory-search.service.ts

  work-items/
    work-items.controller.ts
    work-items.service.ts
    work-item-state-machine.ts
    work-item-context-builder.service.ts

  artifacts/
    artifacts.service.ts
    artifact-validator.service.ts
    artifact-versioning.service.ts

  documents/
    development-spec.service.ts
    document-review.service.ts
    final-document.service.ts
    human-approval.service.ts

  workflows/
    workflow-definitions.service.ts
    workflow-runs.service.ts
    workflow-events.service.ts
    workflow-run-state-machine.ts

  integrations/
    n8n/
      n8n-client.service.ts
      n8n-callback.controller.ts
      n8n-signature.guard.ts

  audit/
    audit.service.ts
    audit.interceptor.ts

  observability/
    health.controller.ts
    metrics.service.ts

  prisma/
    prisma.service.ts
    prisma.module.ts
```

---

## 19. WorkflowDefinition seed جدید

```json
[
  { "code": "project.scan", "name": "Project Scan Artifact", "executor": "internal_worker", "active": true },
  { "code": "task.analyze", "name": "Task Intake Analysis", "executor": "n8n", "n8nPath": "project-memory/draft-artifact", "active": true },
  { "code": "research.run", "name": "Research Run", "executor": "n8n", "n8nPath": "recallhub/research-run", "active": true },
  { "code": "document.generate_spec", "name": "Generate Development Spec", "executor": "n8n", "n8nPath": "recallhub/generate-development-spec", "active": true },
  { "code": "document.review", "name": "Document Review", "executor": "n8n", "n8nPath": "recallhub/document-review", "active": true },
  { "code": "document.finalize", "name": "Final Document Consolidation", "executor": "n8n", "n8nPath": "recallhub/finalize-document", "active": true },
  { "code": "document.revise", "name": "Document Revision", "executor": "n8n", "n8nPath": "recallhub/revise-document", "active": false },
  { "code": "implementation.plan", "name": "Implementation Plan", "executor": "n8n", "n8nPath": "recallhub/implementation-plan", "active": true },
  { "code": "execution.simulate", "name": "Execution Simulation", "executor": "n8n", "n8nPath": "recallhub/execution-simulate", "active": true }
]
```

workflowهای legacy فعلی در seed production فعال نشوند. اگر لازم شد برای مقایسه یا migration اجرا شوند، در environment جدا با نام `legacy.*` ثبت شوند و flag زیر به‌صورت پیش‌فرض false باشد:

```text
ALLOW_LEGACY_N8N_DOMAIN_WRITES=false
```

---

## 20. Docker Compose local اصلاح‌شده

نکته اصلی: n8n به دیتابیس دامنه دسترسی ندارد. فقط API/worker به `recallhub_db` وصل می‌شود. UI با سرویس `web` از build تولیدی Angular روی Nginx اجرا می‌شود.

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: recallhub
      POSTGRES_PASSWORD: recallhub_password
      POSTGRES_DB: recallhub_db
      N8N_DB_USER: n8n
      N8N_DB_PASSWORD: n8n_password
      N8N_DB_NAME: n8n_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d:ro
    ports:
      - "15432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  api:
    build:
      context: ../api
    depends_on:
      - postgres
      - redis
    environment:
      NODE_ENV: development
      PORT: 3000
      DATABASE_URL: postgresql://recallhub:recallhub_password@postgres:5432/recallhub_db
      REDIS_URL: redis://redis:6379
      N8N_INTERNAL_BASE_URL: http://n8n:5678/webhook
      N8N_CALLBACK_URL: http://api:3000/api/v1/integrations/n8n/callback
      N8N_TRIGGER_SECRET: change_me_trigger_secret
      N8N_CALLBACK_SECRET: change_me_callback_secret
      APP_JWT_SECRET: change_me_jwt_secret
      APP_API_KEY: change_me_app_api_key
      APP_API_KEY_ROLES: admin,ops,user
      ALLOWED_REPO_ROOTS: /workspace/repos
    volumes:
      - ../repos:/workspace/repos:ro
    ports:
      - "3000:3000"

  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    depends_on:
      - postgres
      - redis
    environment:
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: n8n_db
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: n8n_password
      N8N_ENCRYPTION_KEY: change_me_32_chars_minimum
      N8N_HOST: localhost
      N8N_PORT: 5678
      N8N_PROTOCOL: http
      WEBHOOK_URL: http://localhost:5678/
      N8N_CALLBACK_URL: http://api:3000/api/v1/integrations/n8n/callback
      N8N_CALLBACK_SECRET: change_me_callback_secret
      N8N_TRIGGER_SECRET: change_me_trigger_secret
      N8N_LLM_MODE: contract_stub
      GENERIC_TIMEZONE: Asia/Tehran
    volumes:
      - n8n_data:/home/node/.n8n
      - ../n8n/workflows/stubs:/workflows/stubs:ro
    ports:
      - "5678:5678"

  web:
    build:
      context: ../web
    depends_on:
      - api
    ports:
      - "4200:80"

volumes:
  postgres_data:
  n8n_data:
```

`postgres/init` باید user/database جدا بسازد:

```sql
CREATE DATABASE n8n_db;
CREATE USER n8n WITH PASSWORD 'n8n_password';
GRANT ALL PRIVILEGES ON DATABASE n8n_db TO n8n;

-- recallhub user owns domain DB. n8n user gets no grant on recallhub schemas.
```

---

## 21. Migration plan از workflowهای فعلی به RecallHub target

### Phase 0 — Lock down

```text
[ ] n8n webhookها public نباشند.
[ ] Angular فقط به NestJS وصل شود.
[ ] n8n DB credential دامنه از environment production حذف شود.
[ ] repoRoot arbitrary در API رد شود.
[ ] hard-coded localhost در WF0 از مسیر production حذف شود.
```

### Phase 1 — NestJS domain schema

```text
[ ] schemaهای recallhub_* با Prisma ساخته شود.
[ ] project/profile/tech-stack/repository/path API پیاده شود.
[ ] audit log و workflow run پیاده شود.
[ ] project setup wizard در Angular ساخته شود.
```

### Phase 2 — Artifact contract

```text
[ ] JSON schema برای artifactهای n8n تعریف شود.
[ ] N8nClient با HMAC و timeout ساخته شود.
[ ] callback controller ساخته شود.
[ ] artifact validator ساخته شود.
```

### Phase 3 — Refactor WF1

```text
[ ] DB nodes از WF1 حذف شود.
[ ] defaultها حذف شود.
[ ] manifest parser امن شود.
[ ] خروجی ProjectScanArtifact شود.
[ ] persistence در NestJS انجام شود.
```

### Phase 4 — Refactor WF2/WF3/WF3B/WF3C/WF3D

```text
[ ] DB read/write از workflowها حذف شود.
[ ] NestJS context packet بسازد.
[ ] n8n فقط artifact برگرداند.
[ ] NestJS state transition و persistence انجام دهد.
```

### Phase 5 — WorkItem pipeline

```text
[ ] WorkItem state machine فعال شود.
[ ] Research-first flow اضافه شود.
[ ] Development spec generation اضافه شود.
[ ] Human approval gate اجباری شود.
[ ] Memory commit بعد از تکمیل کار اجباری شود.
```

### Phase 6 — Stabilization

```text
[ ] Integration tests برای n8n_user no-write روی recallhub_*.
[ ] Sync concurrency lock.
[ ] Reconciliation job.
[ ] Metrics و health checks.
[ ] Backup/restore.
[ ] Runbook.
```

---

## 22. Risk register اصلاح‌شده

| ریسک | شدت | حل قطعی در این سند |
|---|---:|---|
| write مستقیم n8n به DB دامنه | Critical | حذف credential، persistence فقط NestJS، تست privilege |
| SQL string building در n8n | Critical | حذف DB write/read مستقیم، Prisma/parameterized SQL در NestJS |
| repoRoot arbitrary | Critical | RepositoryPathResolver، allowlist، realpath، read-only mount |
| اجرای کد هنگام parse manifest | Critical | حذف Function/eval، parser literal-only/sandbox |
| حدس زدن پروژه و تکنولوژی | High | required fields، no defaults، detected=suggested |
| workflow طولانی synchronous | High | async WorkflowRun + callback + polling |
| prompt injection از repo | High | untrusted context policy و delimiter |
| secret leakage به LLM | High | secret redaction و metadata_only برای config حساس |
| state machine پراکنده | High | WorkItemStateMachine و WorkflowRunStateMachine در NestJS |
| final doc به‌جای approval | High | human approval مستقل و mandatory |
| duplicate/retry corruption | Medium/High | idempotency key و callback replay protection |
| frontend business logic | Medium | Angular فقط UI/API consumer و backend source of truth |
| n8n credential leakage | High | credential store، no domain DB credential، secret manager |
| large DB artifacts | Medium | object storage برای artifact بزرگ |

---

## 23. Acceptance criteria برای MVP جدید

MVP زمانی قابل قبول است که:

```text
[ ] برنامه با نام RecallHub و schemaهای recallhub_* اجرا شود.
[ ] کاربر بتواند پروژه با framework/version/languages/repository/paths/config files تعریف کند.
[ ] هیچ default مخفی برای projectCode/projectName/repoRoot/frameworkVersion استفاده نشود.
[ ] repoRoot فقط از allowlist پذیرفته شود.
[ ] sync پروژه moduleها/files/chunks را بسازد.
[ ] n8n_user هیچ write privilege روی recallhub_* نداشته باشد.
[ ] Angular هیچ n8n webhook را مستقیم صدا نزند.
[ ] همه actionها WorkflowRun و AuditLog بسازند.
[ ] کاربر بتواند WorkItem بسازد و آن را analyze کند.
[ ] research-first flow حداقل برای تولید ResearchFindingsArtifact وجود داشته باشد.
[ ] DevelopmentSpec تولید و review شود.
[ ] FinalDocument بدون HumanApproval قابل implementation نباشد.
[ ] MemoryCommit بعد از تکمیل کار ثبت شود.
[ ] WF4 یا معادل آن فقط به نام Execution Simulation نمایش داده شود.
[ ] خطاهای n8n در WorkflowRun ذخیره و در Angular دیده شوند.
[ ] callback n8n با HMAC validate شود.
[ ] runهای stuck با reconciliation job مشخص شوند.
```

---

## 24. Backlog پیاده‌سازی

### Backend/NestJS

```text
[ ] Create RecallHub NestJS app
[ ] ConfigModule + env validation
[ ] Prisma schema for recallhub_* schemas
[ ] Auth + RBAC + permission guard
[ ] User registration/login/profile/password reset
[ ] User Management APIs
[ ] Role & Permission Management APIs
[ ] Project CRUD
[ ] Tech stack CRUD + detected approval
[ ] Repository binding + path resolver
[ ] Project paths/config files APIs
[ ] Safe scanner or scanner worker
[ ] Secret redaction service
[ ] Memory modules/files/chunks persistence
[ ] WorkItem service + state machine
[ ] Artifact service + validator
[ ] N8nClient + signed trigger
[ ] n8n callback controller + HMAC guard
[ ] WorkflowRun/WorkflowEvent services
[ ] Audit interceptor
[ ] Reconciliation job
[ ] Swagger/OpenAPI
[ ] Integration tests for DB privileges
```

### n8n

```text
[ ] Create new artifact-only workflows under recallhub/* paths
[ ] Remove DB nodes from WF1/WF2/WF3/WF3B/WF3C/WF3D copies
[ ] Remove hard-coded localhost URLs
[ ] Remove defaults from payload normalization
[ ] Add callback node to NestJS
[ ] Add runId/workflowCode passthrough
[ ] Add structured error output
[ ] Add prompt version metadata
[ ] Isolate legacy workflows in dev-only namespace
```

### Angular Web

```text
[ ] Angular workspace under web/
[ ] provideHttpClient در app.config.ts
[ ] lazy routes برای صفحه‌های control plane
[ ] App shell با navigation و active context
[ ] Login/API access page
[ ] Project Setup Wizard
[ ] Project Memory page
[ ] Work Items page با status-aware action gating
[ ] Workflow Runs page با polling/retry/cancel
[ ] Stability Dashboard با role gate و confirm modal
[ ] Audit Timeline read-only
[ ] Register/Forgot Password/Profile pages
[ ] User menu with profile/logout
[ ] User Management page
[ ] Role & Permission Management page
[ ] Dockerfile multi-stage با nginx
[ ] Nginx SPA fallback برای route refresh/deep link
```

### DevOps

```text
[ ] docker-compose local with separated n8n_db user
[ ] PostgreSQL init scripts
[ ] .env.example
[ ] backup/restore scripts
[ ] reverse proxy
[ ] HTTPS for production
[ ] private network for Postgres/Redis/n8n
[ ] secrets management
[ ] log retention
```

---

## 25. Runbook شروع سریع

```bash
cp .env.example .env
cp api/.env.example api/.env
docker compose -f infra/docker-compose.yml up -d postgres redis
cd api
npm install
npm run prisma:generate
npm run db:apply:local
cd ..
docker compose -f infra/docker-compose.yml up -d --build api web n8n
bash n8n/scripts/import-and-publish-stubs.sh
```

تست create project:

```http
POST /api/v1/projects
Content-Type: application/json
```

body:

```json
{
  "project_code": "VODOO",
  "name": "Vodoo",
  "description": "Odoo 19 ERP customization project.",
  "business_domain": "ERP",
  "primary_framework": { "name": "odoo", "version": "19" },
  "tech_stack": [
    { "category": "language", "name": "python", "source": "declared" },
    { "category": "language", "name": "javascript", "source": "declared" },
    { "category": "language", "name": "xml", "source": "declared" },
    { "category": "language", "name": "json", "source": "declared" }
  ]
}
```

تست repository binding:

```http
POST /api/v1/projects/VODOO/repositories
```

body:

```json
{
  "repo_name": "vodoo-main",
  "locator_type": "local_path",
  "repo_root": "/workspace/repos/vodoo",
  "default_branch": "main"
}
```

تست sync:

```http
POST /api/v1/projects/VODOO/sync
Idempotency-Key: sync-vodoo-001
```

اجرای UI:

```http
GET http://localhost:4200
```

برای API key mode، مقدار `APP_API_KEY` از `.env` در صفحه Login وارد شود.

---

## 26. تصمیم‌های نهایی این نسخه

```text
Product name: RecallHub
Frontend/Admin: Angular 21 + Tailwind CSS served by Nginx
Backend/API/Domain: NestJS
ORM/Migration: Prisma
Database: PostgreSQL
Automation/LLM Integration: n8n
Queue/Cache/Locks: Redis
Domain persistence: only NestJS
n8n direct domain DB writes: forbidden
n8n exception: append-only inbox only after ADR, default disabled
Project definition: explicit, no hidden defaults
Repository access: allowlisted and read-only
Manifest parsing: no Function/eval
Work lifecycle: WorkItem state machine
Implementation gate: human approval mandatory
Memory model: immutable events + memory commits
```

---

## 27. جمع‌بندی

RecallHub باید از prototype فعلی n8n-heavy به یک سیستم قابل اتکا تبدیل شود. workflowهای فعلی برای شناخت domain بسیار ارزشمندند، اما نباید مالک دیتابیس و state باشند. مسیر درست این است:

```text
1. نام و domain را به RecallHub تثبیت کن.
2. تعریف پروژه را explicit و بدون default مخفی بساز.
3. Repository و pathها را امن و allowlisted کن.
4. persistence و state machine را کامل به NestJS منتقل کن.
5. n8n را به artifact producer تبدیل کن.
6. research -> development spec -> review -> approval -> implementation -> validation -> memory commit را به چرخه اصلی تبدیل کن.
7. هر کاری که روی پروژه انجام شد، با دلیل و نتیجه در حافظه همان پروژه ثبت شود.
```

با این نسخه، سند از حالت معماری عمومی به نقشه اجرایی روشن برای ساخت RecallHub تبدیل شده است.

---

## 28. وضعیت پیاده‌سازی فعلی نسبت به این سند

این بخش بر اساس فایل‌های موجود در repository در تاریخ 2026-05-12 نوشته شده است و حدس یا فرض بیرون از کد ندارد.

### 28.1 پیاده‌سازی‌شده

```text
[x] Angular workspace در web/
[x] Angular 21 application با standalone/lazy route style
[x] provideHttpClient در app.config.ts
[x] صفحه Login/API access
[x] صفحه Project Setup Wizard
[x] صفحه Project Memory
[x] صفحه Work Items با status-aware action gating
[x] صفحه Workflow Runs با retry/cancel/poll
[x] صفحه Stability Dashboard با role gate و confirm modal
[x] صفحه Audit Timeline read-only
[x] Dockerfile چندمرحله‌ای برای Angular build و Nginx serve
[x] Nginx fallback به index.html برای routeهای SPA
[x] حذف سرویس frontend قبلی از docker-compose
[x] سرویس web در docker-compose روی port 4200
```

Backend موجود:

```text
[x] NestJS API پایه
[x] Auth guard با Bearer/API key
[x] Permission/Role guard
[x] Project CRUD و project configuration endpoints
[x] Repository validation/path resolver
[x] Project sync داخلی
[x] Memory modules/files/chunks/events/commits read endpoints
[x] WorkItem lifecycle endpoints
[x] WorkflowDefinition/WorkflowRun/WorkflowEvent endpoints
[x] n8n signed trigger client
[x] n8n signed callback controller/guard
[x] Artifact schema validator
[x] Audit service/controller
[x] Stability health و reconcile stale workflow runs
[x] Migration برای محدود کردن privilegeهای n8n
[x] test:n8n-privileges script
```

n8n موجود:

```text
[x] artifact-only stub workflows
[x] callback envelope/schema contract
[x] import script برای workflowهای stub
[x] contract_stub mode برای اجرای local بدون provider واقعی LLM
```

### 28.2 پیاده‌سازی partial

```text
[~] UI همه actionهای اصلی را دارد، اما صفحه جداگانه برای Research & Specs، Document Review Queue و Artifacts هنوز مستقل نشده است.
[~] Work Items UI context packet را نشان می‌دهد، اما artifact list endpoint را هنوز به یک viewer اختصاصی وصل نکرده است.
[~] Human approval در Work Items وجود دارد، اما queue عملیاتی جدا برای چند WorkItem ندارد.
[~] Workflow polling در Angular وجود دارد، اما backoff/timeout policy هنوز ساده است.
[~] API auth با API key/JWT پایه وجود دارد، اما user management کامل و role persistence در دیتابیس هنوز در سند و کد به شکل کامل نهایی نشده است.
[~] Project sync داخلی وجود دارد، اما Redis/advisory lock برای concurrency طبق سند هنوز باید دقیق‌تر بررسی/تکمیل شود.
[~] Object storage برای artifactهای بزرگ هنوز پیاده‌سازی نشده و MVP فعلاً Postgres را نگه می‌دارد.
```

### 28.3 هنوز پیاده‌سازی نشده یا نیازمند تصمیم بعدی

```text
[ ] صفحه/flow مستقل برای Research & Specs
[ ] صفحه/flow مستقل برای Document Review
[ ] Human Approval Queue برای چند work item
[ ] Artifacts viewer با markdown/json rendering امن
[ ] Settings page برای API base URL/roles/policies در سطح سازمانی
[ ] تست‌های frontend برای status-aware gating
[ ] AXE/accessibility test خودکار برای Angular UI
[ ] reverse proxy production برای مسیرهای / و /api
[ ] HTTPS و secret management production
[ ] object storage برای artifactهای بزرگ
[ ] continuous metrics/observability کامل
[ ] backup/restore scripts
```

### 28.4 جمع‌بندی وضعیت

```text
Frontend/Angular: حدود 70% از MVP کنترل‌پلین عملیاتی پیاده شده است.
Backend/NestJS: حدود 75% از MVP دامنه و orchestration پیاده شده است.
n8n artifact path: حدود 65% برای stub/local contract test آماده است.
DevOps local: حدود 70% آماده است؛ production hardening هنوز باقی است.
کل MVP نسبت به این سند: حدود 70% پیاده‌سازی شده است.
```

این درصدها تخمینی اما مبتنی بر فایل‌های واقعی همین repository هستند؛ معیار دقیق‌تر باید بعد از تعریف test matrix و acceptance testهای executable محاسبه شود.
