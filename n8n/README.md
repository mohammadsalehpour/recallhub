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
