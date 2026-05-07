export default {
  terminalStatuses: ['succeeded', 'failed', 'cancelled', 'timed_out', 'callback_missing'],
  inFlightStatuses: ['pending', 'queued', 'running', 'retrying'],
  lifecycleWorkflows: [
    'task.analyze',
    'research.run',
    'document.generate_spec',
    'document.review',
    'document.finalize',
    'document.revise',
    'implementation.plan',
    'execution.simulate',
  ],

  selectedRun() {
    return tblWorkflowRuns.selectedRow || qWorkflowRunGet.data?.data || {};
  },

  selectedRunId() {
    return this.selectedRun()?.id || appsmith.store.activeRunId || '';
  },

  selectedRunStatus() {
    return this.selectedRun()?.status || qWorkflowRunGet.data?.data?.status || 'not_selected';
  },

  selectedRunSummary() {
    const run = this.selectedRun();
    const workflowCode = run?.workflowDefinition?.code || run?.workflowCode || selWorkflowCode.selectedOptionValue || 'workflow';
    const status = this.selectedRunStatus();
    const runId = this.selectedRunId() || 'no run selected';
    return `${workflowCode} | ${status} | ${runId}`;
  },

  selectedRunArtifact() {
    const output = qWorkflowRunGet.data?.data?.outputJson || this.selectedRun()?.outputJson || {};
    return output.artifact || output;
  },

  selectedRunError() {
    return qWorkflowRunGet.data?.data?.errorJson || this.selectedRun()?.errorJson || {};
  },

  canRetry(run = this.selectedRun()) {
    return ['failed', 'timed_out', 'callback_missing'].includes(run?.status);
  },

  canCancel(run = this.selectedRun()) {
    return this.inFlightStatuses.includes(run?.status);
  },

  manualWorkflowInput() {
    const raw = txtWorkflowInput.text;
    if (!raw || !String(raw).trim()) return {};
    try {
      return JSON.parse(raw);
    } catch (error) {
      showAlert('Workflow input باید JSON معتبر باشد', 'warning');
      return {};
    }
  },

  async selectRun(run) {
    if (!run?.id) return;
    await storeValue('activeRunId', run.id, false);
    await Promise.all([qWorkflowRunGet.run(), qWorkflowRunEvents.run()]);
  },

  async refreshRuns() {
    await qWorkflowRunsList.run();
    if (appsmith.store.activeRunId) {
      await Promise.all([qWorkflowRunGet.run(), qWorkflowRunEvents.run()]);
    }
  },

  async startManualWorkflow() {
    if (!selWorkflowCode.selectedOptionValue) {
      showAlert('ابتدا workflow را انتخاب کنید', 'warning');
      return;
    }
    if (this.lifecycleWorkflows.includes(selWorkflowCode.selectedOptionValue)) {
      showAlert('این workflow باید از صفحه Work Items و با کنترل state/approval اجرا شود', 'warning');
      return;
    }

    try {
      await storeValue('workflowIdempotencyKey', JS_AppShell.idempotencyKey('workflow-run'), false);
      await qWorkflowRunCreate.run();
      const runId = qWorkflowRunCreate.data?.data?.id;
      if (runId) {
        await storeValue('activeRunId', runId, false);
        showAlert(`Workflow run شروع شد: ${runId}`, 'info');
        await this.pollRun(runId);
        return;
      }
      await this.refreshRuns();
    } catch (error) {
      JS_AppShell.notifyError(error, 'ساخت workflow run ناموفق بود');
    }
  },

  async retryRun() {
    if (!appsmith.store.activeRunId || !this.canRetry()) {
      showAlert('این run در وضعیت قابل retry نیست', 'warning');
      return;
    }

    try {
      await qWorkflowRunRetry.run();
      showAlert('Retry برای workflow run ثبت شد', 'info');
      await this.pollRun(appsmith.store.activeRunId);
      await this.refreshRuns();
    } catch (error) {
      JS_AppShell.notifyError(error, 'Retry workflow run ناموفق بود');
    }
  },

  async cancelRun() {
    if (!appsmith.store.activeRunId || !this.canCancel()) {
      showAlert('این run در وضعیت قابل cancel نیست', 'warning');
      return;
    }

    try {
      await qWorkflowRunCancel.run();
      await this.refreshRuns();
      showAlert('Workflow run لغو شد', 'info');
    } catch (error) {
      JS_AppShell.notifyError(error, 'Cancel workflow run ناموفق بود');
    }
  },

  async pollRun(runId, maxAttempts = 45, delayMs = 2000) {
    if (!runId) return;

    await storeValue('activeRunId', runId, false);

    for (let i = 0; i < maxAttempts; i++) {
      await qWorkflowRunGet.run();
      const run = qWorkflowRunGet.data?.data;

      if (this.stopOnTerminal(run?.status)) {
        showAlert(`Run ${runId} به وضعیت ${run.status} رسید`, 'info');
        await qWorkflowRunEvents.run();
        await qWorkflowRunsList.run();
        return run;
      }

      const nextDelay = Math.min(delayMs * Math.max(1, Math.ceil((i + 1) / 5)), 15000);
      await new Promise((resolve) => setTimeout(resolve, nextDelay));
    }

    showAlert('Polling timeout رسید. وضعیت run را دستی بررسی کنید.', 'warning');
    return null;
  },

  stopOnTerminal(status) {
    return this.terminalStatuses.includes(status);
  }
};
