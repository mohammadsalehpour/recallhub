export default {
  required(value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
  },

  normalizeProjectCode(value) {
    return String(value || '').trim().toUpperCase();
  },

  normalizedTechStack() {
    const rows = Array.isArray(tblTechStack.tableData) ? tblTechStack.tableData : [];
    return rows
      .filter((row) => this.required(row.category) && this.required(row.name) && this.required(row.source))
      .map((row) => ({
        category: String(row.category).trim(),
        name: String(row.name).trim(),
        version: this.required(row.version) ? String(row.version).trim() : undefined,
        source: row.source,
        notes: this.required(row.notes) ? String(row.notes).trim() : undefined,
      }));
  },

  validateProjectForm() {
    const missing = [];
    if (!this.required(inpProjectCode.text)) missing.push('Project Code');
    if (!this.required(inpProjectName.text)) missing.push('Name');
    if (!this.required(inpProjectDescription.text)) missing.push('Description');
    if (!this.required(inpFrameworkName.text)) missing.push('Framework Name');
    if (!this.required(inpFrameworkVersion.text)) missing.push('Framework Version');

    const stack = this.normalizedTechStack();
    if (stack.length === 0) missing.push('Tech Stack');
    if (!stack.some((item) => item.source === 'declared')) missing.push('Declared Tech Stack Item');

    if (missing.length > 0) {
      showAlert(`فیلدهای اجباری کامل نیستند: ${missing.join(', ')}`, 'warning');
      return false;
    }

    return true;
  },

  async selectProject(project) {
    if (!project?.projectCode && !project?.project_code) return;
    const projectCode = project.projectCode || project.project_code;
    await storeValue('activeProjectCode', this.normalizeProjectCode(projectCode), true);
    if (project.id) await storeValue('activeProjectId', project.id, true);
    await Promise.all([
      qProjectGet.run(),
      qRepositoryList.run(),
      qPathList.run(),
      qConfigList.run(),
      qProjectTechStack.run(),
    ]);
  },

  async refreshActiveProject() {
    if (!appsmith.store.activeProjectCode) return;
    await Promise.all([
      qProjectGet.run(),
      qRepositoryList.run(),
      qPathList.run(),
      qConfigList.run(),
      qProjectTechStack.run(),
    ]);
  },

  async createProjectWizardFlow() {
    if (!this.validateProjectForm()) return;

    try {
      await qProjectCreate.run();
      const project = qProjectCreate.data?.data;
      const projectCode = project?.projectCode || inpProjectCode.text;
      await storeValue('activeProjectCode', this.normalizeProjectCode(projectCode), true);
      if (project?.id) await storeValue('activeProjectId', project.id, true);

      showAlert('پروژه با موفقیت ثبت شد', 'success');
      await Promise.all([qProjectList.run(), this.refreshActiveProject()]);
    } catch (error) {
      JS_AppShell.notifyError(error, 'ثبت پروژه ناموفق بود');
    }
  },

  validateRepositoryForm() {
    if (!appsmith.store.activeProjectCode) {
      showAlert('ابتدا پروژه را انتخاب کنید', 'warning');
      return false;
    }
    if (!this.required(inpRepoName.text) || !this.required(inpRepoRoot.text) || !this.required(selRepoLocatorType.selectedOptionValue)) {
      showAlert('نام repository، نوع locator و repo root اجباری هستند', 'warning');
      return false;
    }
    return true;
  },

  async createRepository() {
    if (!this.validateRepositoryForm()) return;

    try {
      await qRepoCreate.run();
      const repo = qRepoCreate.data?.data;
      if (repo?.id) await storeValue('activeRepositoryId', repo.id, true);
      await Promise.all([qRepositoryList.run(), qProjectGet.run()]);
      showAlert('Repository ثبت شد', 'success');
    } catch (error) {
      JS_AppShell.notifyError(error, 'ثبت repository ناموفق بود');
    }
  },

  async selectRepository(repository) {
    if (!repository?.id) return;
    await storeValue('activeRepositoryId', repository.id, true);
  },

  async validateRepository() {
    if (!appsmith.store.activeProjectCode || !appsmith.store.activeRepositoryId) {
      showAlert('ابتدا پروژه و repository را انتخاب کنید', 'warning');
      return;
    }

    try {
      await qRepoValidate.run();
      await qRepositoryList.run();
      showAlert('Repository توسط backend validate شد', 'success');
    } catch (error) {
      JS_AppShell.notifyError(error, 'Validation repository ناموفق بود');
    }
  },

  async createPath() {
    if (!appsmith.store.activeRepositoryId) {
      showAlert('ابتدا repository را انتخاب کنید', 'warning');
      return;
    }
    if (!this.required(inpPath.text) || !this.required(selPathType.selectedOptionValue) || !this.required(selScanPolicy.selectedOptionValue) || !this.required(selOwnership.selectedOptionValue)) {
      showAlert('path، path type، scan policy و ownership اجباری هستند', 'warning');
      return;
    }

    try {
      await qPathCreate.run();
      await qPathList.run();
      showAlert('Path ثبت شد', 'success');
    } catch (error) {
      JS_AppShell.notifyError(error, 'ثبت path ناموفق بود');
    }
  },

  async createConfigFile() {
    if (!appsmith.store.activeRepositoryId) {
      showAlert('ابتدا repository را انتخاب کنید', 'warning');
      return;
    }
    if (!this.required(inpConfigRelativePath.text) || !this.required(inpConfigType.text) || !this.required(selContainsSecrets.selectedOptionValue) || !this.required(selConfigScanPolicy.selectedOptionValue)) {
      showAlert('relative path، config type، contains secrets و scan policy اجباری هستند', 'warning');
      return;
    }

    try {
      await qConfigCreate.run();
      await qConfigList.run();
      showAlert('Config file ثبت شد', 'success');
    } catch (error) {
      JS_AppShell.notifyError(error, 'ثبت config file ناموفق بود');
    }
  },

  async validateRepositoryAndSync() {
    if (!appsmith.store.activeProjectCode) {
      showAlert('ابتدا پروژه را انتخاب کنید', 'warning');
      return;
    }

    try {
      if (appsmith.store.activeRepositoryId) {
        await qRepoValidate.run();
        await qRepositoryList.run();
      }

      const key = JS_AppShell.idempotencyKey('project-sync');
      await storeValue('syncIdempotencyKey', key, false);

      await qProjectSync.run();
      const runId = qProjectSync.data?.data?.workflowRun?.id;

      if (runId) {
        await storeValue('activeRunId', runId, false);
        showAlert(`Sync شروع شد. RunId: ${runId}`, 'info');
        await Promise.all([qWorkflowRunsList.run(), qMemoryEvents.run()]);
      } else {
        showAlert('Sync اجرا شد', 'success');
      }
    } catch (error) {
      JS_AppShell.notifyError(error, 'Sync پروژه ناموفق بود');
    }
  }
};
