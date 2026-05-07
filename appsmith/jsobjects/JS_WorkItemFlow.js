export default {
  allowedStatusByAction: {
    research: ['needs_research', 'research_ready'],
    spec: ['research_ready', 'spec_review'],
    approval: ['needs_human_approval'],
    implementationPlan: ['approved_for_implementation', 'implementation_planning'],
    executionSimulation: ['implementation_planning'],
    memoryCommit: ['done_pending_memory_commit'],
  },

  required(value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
  },

  selectedWorkItem() {
    return tblWorkItems.selectedRow || qWorkItemCreate.data?.data || {};
  },

  selectedStatus() {
    return this.selectedWorkItem()?.status || appsmith.store.activeWorkItemStatus || '';
  },

  can(action, status = this.selectedStatus()) {
    return (this.allowedStatusByAction[action] || []).includes(status);
  },

  actionTooltip(action) {
    const status = this.selectedStatus() || 'unknown';
    if (this.can(action, status)) return '';
    const allowed = (this.allowedStatusByAction[action] || []).join(', ');
    return `وضعیت فعلی ${status} است. این action فقط در وضعیت‌های ${allowed} مجاز است.`;
  },

  openQuestions() {
    const rows = Array.isArray(tblOpenQuestions.tableData) ? tblOpenQuestions.tableData : [];
    return rows
      .map((row) => row.question)
      .filter((question) => this.required(question))
      .map((question) => String(question).trim());
  },

  createMetadata() {
    return {
      ui_source: 'appsmith',
      active_project_code: appsmith.store.activeProjectCode,
    };
  },

  workflowInput() {
    return {
      uiSource: 'appsmith',
      activeProjectCode: appsmith.store.activeProjectCode,
      activeWorkItemId: appsmith.store.activeWorkItemId,
    };
  },

  filesTouched() {
    const rows = Array.isArray(tblFilesTouched.tableData) ? tblFilesTouched.tableData : [];
    return rows.map((row) => row.path).filter((path) => this.required(path));
  },

  modulesTouched() {
    const rows = Array.isArray(tblModulesTouched.tableData) ? tblModulesTouched.tableData : [];
    return rows.map((row) => row.module).filter((module) => this.required(module));
  },

  commandsRun() {
    const rows = Array.isArray(tblCommandsRun.tableData) ? tblCommandsRun.tableData : [];
    return rows.map((row) => row.command).filter((command) => this.required(command));
  },

  risksRemaining() {
    const rows = Array.isArray(tblRisksRemaining.tableData) ? tblRisksRemaining.tableData : [];
    return rows.map((row) => row.risk).filter((risk) => this.required(risk));
  },

  validationResult() {
    return {
      summary: inpValidationSummary.text || 'unknown',
      status: selValidationStatus.selectedOptionValue || 'unknown',
    };
  },

  async selectWorkItem(workItem) {
    if (!workItem?.id) return;
    await storeValue('activeWorkItemId', workItem.id, false);
    await storeValue('activeWorkItemStatus', workItem.status, false);
    await qWorkItemContext.run();
  },

  async createWorkItem() {
    if (!appsmith.store.activeProjectCode) {
      showAlert('ابتدا پروژه فعال را انتخاب کنید', 'warning');
      return;
    }
    if (!this.required(inpWorkItemTitle.text) || !this.required(inpWorkItemRequest.text) || !this.required(selRequestType.selectedOptionValue)) {
      showAlert('title، original request و request type اجباری هستند', 'warning');
      return;
    }

    try {
      await qWorkItemCreate.run();
      await qWorkItemList.run();

      const item = qWorkItemCreate.data?.data;
      if (item?.id) await this.selectWorkItem(item);

      showAlert('Work Item ثبت شد', 'success');
    } catch (error) {
      JS_AppShell.notifyError(error, 'ثبت Work Item ناموفق بود');
    }
  },

  async startResearch() {
    if (!this.can('research')) {
      showAlert(this.actionTooltip('research'), 'warning');
      return;
    }

    try {
      await storeValue('workItemActionKey', JS_AppShell.idempotencyKey('wi-research'), false);
      await qWorkItemResearchStart.run();
      const runId = qWorkItemResearchStart.data?.data?.workflowRun?.id;
      if (runId) await storeValue('activeRunId', runId, false);
      await Promise.all([qWorkItemList.run(), qWorkItemContext.run(), qWorkflowRunsList.run()]);
      showAlert('Research flow شروع شد', 'info');
    } catch (error) {
      JS_AppShell.notifyError(error, 'شروع research ناموفق بود');
    }
  },

  async startSpec() {
    if (!this.can('spec')) {
      showAlert(this.actionTooltip('spec'), 'warning');
      return;
    }

    try {
      await storeValue('workItemActionKey', JS_AppShell.idempotencyKey('wi-spec'), false);
      await qWorkItemSpecStart.run();
      const runId = qWorkItemSpecStart.data?.data?.workflowRun?.id;
      if (runId) await storeValue('activeRunId', runId, false);
      await Promise.all([qWorkItemList.run(), qWorkItemContext.run(), qWorkflowRunsList.run()]);
      showAlert('Spec generation flow شروع شد', 'info');
    } catch (error) {
      JS_AppShell.notifyError(error, 'شروع spec ناموفق بود');
    }
  },

  async submitApproval(decision) {
    if (!this.can('approval')) {
      showAlert(this.actionTooltip('approval'), 'warning');
      return;
    }

    try {
      await selApprovalDecision.setSelectedOption(decision);
      await qWorkItemApproval.run();
      const updated = qWorkItemApproval.data?.data;
      if (updated?.status) await storeValue('activeWorkItemStatus', updated.status, false);
      await Promise.all([qWorkItemList.run(), qWorkItemContext.run(), qMemoryEvents.run()]);
      showAlert('Human approval ثبت شد', 'success');
    } catch (error) {
      JS_AppShell.notifyError(error, 'ثبت approval ناموفق بود');
    }
  },

  async createImplementationPlan() {
    if (!this.can('implementationPlan')) {
      showAlert(this.actionTooltip('implementationPlan'), 'warning');
      return;
    }

    try {
      await storeValue('workItemActionKey', JS_AppShell.idempotencyKey('wi-implementation-plan'), false);
      await qWorkItemImplementationPlan.run();
      const runId = qWorkItemImplementationPlan.data?.data?.workflowRun?.id;
      if (runId) await storeValue('activeRunId', runId, false);
      await Promise.all([qWorkItemList.run(), qWorkItemContext.run(), qWorkflowRunsList.run()]);
      showAlert('Implementation plan flow شروع شد', 'info');
    } catch (error) {
      JS_AppShell.notifyError(error, 'ساخت implementation plan ناموفق بود');
    }
  },

  async simulateExecution() {
    if (!this.can('executionSimulation')) {
      showAlert(this.actionTooltip('executionSimulation'), 'warning');
      return;
    }

    try {
      await storeValue('workItemActionKey', JS_AppShell.idempotencyKey('wi-execution-simulate'), false);
      await qWorkItemExecutionSimulate.run();
      const runId = qWorkItemExecutionSimulate.data?.data?.workflowRun?.id;
      if (runId) await storeValue('activeRunId', runId, false);
      await Promise.all([qWorkItemList.run(), qWorkItemContext.run(), qWorkflowRunsList.run()]);
      showAlert('Execution simulation شروع شد', 'info');
    } catch (error) {
      JS_AppShell.notifyError(error, 'شروع execution simulation ناموفق بود');
    }
  },

  async submitMemoryCommit() {
    if (!this.can('memoryCommit')) {
      showAlert(this.actionTooltip('memoryCommit'), 'warning');
      return;
    }
    if (!this.required(inpCommitTitle.text) || !this.required(inpWhatChanged.text) || !this.required(inpWhyChanged.text) || !this.required(inpHowChanged.text)) {
      showAlert('title، what/why/how changed برای Memory Commit اجباری هستند', 'warning');
      return;
    }

    try {
      await qWorkItemMemoryCommit.run();
      const updated = qWorkItemMemoryCommit.data?.data?.workItem;
      if (updated?.status) await storeValue('activeWorkItemStatus', updated.status, false);
      await Promise.all([qWorkItemList.run(), qMemoryCommits.run(), qMemoryEvents.run()]);
      showAlert('Memory commit ثبت و Work Item تکمیل شد', 'success');
    } catch (error) {
      JS_AppShell.notifyError(error, 'ثبت Memory Commit ناموفق بود');
    }
  }
};
