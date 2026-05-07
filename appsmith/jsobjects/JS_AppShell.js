export default {
  pages: [
    { label: 'Login', page: 'P01_Login' },
    { label: 'Project Setup', page: 'P10_Project_Setup_Wizard' },
    { label: 'Project Memory', page: 'P20_Project_Memory' },
    { label: 'Work Items', page: 'P30_Work_Items' },
    { label: 'Workflow Runs', page: 'P40_Workflow_Runs_Monitor' },
    { label: 'Stability', page: 'P50_Stability_Dashboard', adminOnly: true },
    { label: 'Audit', page: 'P60_Audit_Timeline' },
  ],

  idempotencyKey(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  },

  async saveToken() {
    if (!inpToken.text || !String(inpToken.text).trim()) {
      showAlert('Token خالی است', 'warning');
      return;
    }
    await storeValue('token', String(inpToken.text).trim(), true);
    showAlert('Token ذخیره شد', 'success');
    navigateTo('P10_Project_Setup_Wizard');
  },

  async saveApiBaseUrl() {
    if (!inpApiBaseUrl.text || !String(inpApiBaseUrl.text).trim()) {
      showAlert('Base URL خالی است', 'warning');
      return;
    }
    await storeValue('apiBaseUrl', String(inpApiBaseUrl.text).trim(), true);
    showAlert('API Base URL ذخیره شد', 'success');
  },

  async setRole(role) {
    await storeValue('activeRole', role, true);
  },

  async setActiveUserId() {
    const value = inpActiveUserId.text;
    if (!value || !String(value).trim()) {
      await removeValue('activeUserId');
      showAlert('User ID پاک شد', 'info');
      return;
    }
    await storeValue('activeUserId', String(value).trim(), true);
    showAlert('User ID ذخیره شد', 'success');
  },

  async logout() {
    await removeValue('token');
    await removeValue('activeProjectCode');
    await removeValue('activeProjectId');
    await removeValue('activeRepositoryId');
    await removeValue('activeWorkItemId');
    await removeValue('activeRunId');
    showAlert('خروج انجام شد', 'info');
    navigateTo('P01_Login');
  },

  isAdmin() {
    return ['admin', 'owner', 'ops'].includes(appsmith.store.activeRole);
  },

  requireAdmin() {
    if (this.isAdmin()) return true;
    showAlert('این عملیات فقط برای نقش مجاز فعال است', 'warning');
    return false;
  },

  staleMinutes() {
    const parsed = Number(inpStaleMinutes.text);
    if (!Number.isFinite(parsed) || parsed <= 0) return 30;
    return Math.min(Math.floor(parsed), 1440);
  },

  dataRows(queryData) {
    if (Array.isArray(queryData)) return queryData;
    if (Array.isArray(queryData?.data)) return queryData.data;
    return [];
  },

  projectRows() {
    return this.dataRows(qProjectList.data);
  },

  runRows() {
    return this.dataRows(qWorkflowRunsList.data);
  },

  notifyError(error, fallbackMessage = 'درخواست ناموفق بود') {
    const message =
      error?.responseMeta?.body?.message ||
      error?.responseMeta?.body?.error?.message ||
      error?.message ||
      fallbackMessage;
    showAlert(`${fallbackMessage}: ${message}`, 'error');
  },

  auditTimelineRows() {
    const auditLogs = this.dataRows(qAuditLogs.data).map((event) => ({
      source: 'audit',
      timestamp: event.createdAt || event.created_at,
      type: event.action,
      summary: `${event.outcome || 'success'} ${event.resourceType || ''}`,
      resourceId: event.resourceId || event.id,
    }));

    const workflowRuns = this.dataRows(qAuditWorkflowRuns.data).map((run) => ({
      source: 'workflow_run',
      timestamp: run.createdAt || run.created_at,
      type: run.workflowDefinition?.code || run.workflow_definition?.code || run.status,
      summary: `Run ${run.status}`,
      resourceId: run.id,
    }));

    return [...auditLogs, ...workflowRuns].sort((a, b) =>
      String(b.timestamp || '').localeCompare(String(a.timestamp || '')),
    );
  },

  async startupFromUrl() {
    const query = appsmith.URL.queryParams || {};
    if (query.project) await storeValue('activeProjectCode', String(query.project).toUpperCase(), true);
    if (query.workItem) await storeValue('activeWorkItemId', query.workItem, false);
    if (query.run) await storeValue('activeRunId', query.run, false);
  },
};
