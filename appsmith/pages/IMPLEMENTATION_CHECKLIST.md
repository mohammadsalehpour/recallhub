# Appsmith Implementation Checklist

این چک‌لیست برای پیاده‌سازی عملی سند `appsmith/README.md` است.

## P01_Login
- [ ] `inpToken`
- [ ] `btnSaveToken`
- [ ] save token into store

## P10_Project_Setup_Wizard
- [ ] فرم Create Project
- [ ] Grid/Editable table برای tech_stack
- [ ] فرم Repository
- [ ] فرم Paths
- [ ] فرم Config Files
- [ ] دکمه Validate Repo
- [ ] دکمه Sync Project

## P20_Project_Memory
- [ ] تب Modules + table
- [ ] تب Files + table
- [ ] تب Chunks + table
- [ ] تب Events + table
- [ ] تب Commits + table

## P30_Work_Items
- [ ] فرم Create WorkItem
- [ ] Table لیست WorkItem
- [ ] پنل Context Packet
- [ ] دکمه Start Research
- [ ] دکمه Start Spec
- [ ] دکمه Human Approval
- [ ] فرم Memory Commit

## P40_Workflow_Runs_Monitor
- [ ] جدول Workflow Runs
- [ ] جزئیات run انتخابی
- [ ] جدول Events
- [ ] Auto-refresh/poll

## P50_Stability_Dashboard
- [ ] KPI: project count
- [ ] KPI: stale runs
- [ ] Breakdown: workflow run statuses
- [ ] دکمه Reconcile + confirm modal

## Security/Architecture Checks
- [ ] هیچ query مستقیم به n8n ندارد
- [ ] هیچ DB datasource برای domain tables تعریف نشده
- [ ] هیچ secret hard-coded در JS Objectها نیست
- [ ] actionهای admin role-gated هستند
- [ ] status transitions فقط از backend می‌آید
