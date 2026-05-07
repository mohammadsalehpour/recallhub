# RecallHub n8n Workspace

این پوشه برای توسعه بخش n8n در معماری جدید RecallHub است؛
طبق سند توسعه، n8n فقط **executor + artifact producer** است و مالک persistence نیست.

## اصل‌های اجرایی

1. n8n نباید به `recallhub_*` write بزند.
2. هر workflow باید در پایان یک callback امضاشده به NestJS بفرستد.
3. خروجی باید با قرارداد JSON Schema داخل `n8n/contracts` سازگار باشد.
4. `workflowCode` باید با run ساخته‌شده در NestJS match باشد.

## قراردادها

- `contracts/callback-envelope.schema.json`: envelope اصلی callback
- `contracts/project-scan-artifact.schema.json`: قرارداد artifact اسکن پروژه
- `contracts/development-spec-artifact.schema.json`: قرارداد artifact سند توسعه

## الگوی ارسال callback

Headerهای اجباری:

- `x-recallhub-timestamp`
- `x-recallhub-run-id`
- `x-recallhub-signature`

فرمول امضا:

```text
auth_payload = `${timestamp}.${runId}.${rawBody}`
signature = HMAC_SHA256(N8N_CALLBACK_SECRET, auth_payload)
```

## Workflow template

در `workflows/templates/recallhub_artifact_callback_template.json` یک template آماده گذاشته شده که:

- context packet را دریافت می‌کند
- یک artifact نمونه می‌سازد
- callback را به NestJS ارسال می‌کند

این template برای شروع refactor WF2/WF3 و همسان‌سازی خروجی‌ها با contractها است.

## LLM artifact workflows

فایل‌های `workflows/stubs/*.json` workflowهای importable برای مسیر end-to-end MVP هستند.
هر فایل یک Webhook production path پایدار دارد:

```text
/webhook/recallhub/task.analyze
/webhook/recallhub/research.run
/webhook/recallhub/document.generate_spec
/webhook/recallhub/document.review
/webhook/recallhub/document.finalize
/webhook/recallhub/document.revise
/webhook/recallhub/implementation.plan
/webhook/recallhub/execution.simulate
```

این workflowها دیگر DB persistence انجام نمی‌دهند. هر workflow:

1. trigger امضاشده NestJS را validate می‌کند.
2. در حالت `N8N_LLM_MODE=openai` از OpenAI Responses API با structured JSON schema خروجی می‌گیرد.
3. artifact را در callback امضاشده به NestJS برمی‌گرداند.

برای توسعه محلی، `N8N_LLM_MODE=contract_stub` مجاز است تا transport و callback بدون credential تست شود. این حالت production LLM output نیست و داخل artifact هم همین را اعلام می‌کند.

برای real LLM mode، این envها باید صریح تنظیم شوند:

```bash
N8N_LLM_MODE=openai
N8N_LLM_MODEL=<official OpenAI model id>
OPENAI_API_KEY=<your key>
OPENAI_BASE_URL=https://api.openai.com/v1
```

اگر `N8N_LLM_MODE=openai` باشد ولی مدل یا API key تنظیم نشده باشد، workflow با callback `failed` و کدهای `MISSING_LLM_MODEL` یا `MISSING_LLM_API_KEY` برمی‌گردد؛ خروجی حدسی ساخته نمی‌شود.

Import محلی با CLI رسمی n8n:

```bash
node n8n/scripts/generate-llm-workflows.mjs
bash n8n/scripts/import-and-publish-stubs.sh
```

طبق مستندات n8n، production webhookها زمانی فعال‌اند که workflow ذخیره و active باشد.
