# Appsmith Implementation Checklist

این چک‌لیست برای پیاده‌سازی عملی سند `appsmith/README.md` است.

## P01_Login
- [x] `inpToken`
- [x] `btnSaveToken`
- [x] save token into store

## P10_Project_Setup_Wizard
- [x] فرم Create Project
- [x] Grid/Editable table برای tech_stack
- [x] فرم Repository
- [x] فرم Paths
- [x] فرم Config Files
- [x] دکمه Validate Repo
- [x] دکمه Sync Project

## P20_Project_Memory
- [x] تب Modules + table
- [x] تب Files + table
- [x] تب Chunks + table
- [x] تب Events + table
- [x] تب Commits + table

## P30_Work_Items
- [x] فرم Create WorkItem
- [x] Table لیست WorkItem
- [x] پنل Context Packet
- [x] دکمه Start Research
- [x] دکمه Start Spec
- [x] دکمه Human Approval
- [x] فرم Memory Commit

## P40_Workflow_Runs_Monitor
- [x] جدول Workflow Runs
- [x] جزئیات run انتخابی
- [x] جدول Events
- [x] Auto-refresh/poll
- [x] دکمه Retry
- [x] دکمه Cancel

## P50_Stability_Dashboard
- [x] KPI: project count
- [x] KPI: stale runs
- [x] Breakdown: workflow run statuses
- [x] دکمه Reconcile + confirm modal

## P60_Audit_Timeline
- [x] Timeline read-only از memory events
- [x] Workflow runs در timeline
- [x] Workflow events برای run انتخابی
- [x] Refresh action

## Security/Architecture Checks
- [x] هیچ query مستقیم به n8n ندارد
- [x] هیچ DB datasource برای domain tables تعریف نشده
- [x] هیچ secret hard-coded در JS Objectها نیست
- [x] actionهای admin role-gated هستند
- [x] status transitions فقط از backend می‌آید
