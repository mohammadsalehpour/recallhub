export default {
  async createProjectWizardFlow() {
    if (!inpProjectCode.text || !inpProjectName.text || !inpFrameworkVersion.text) {
      showAlert('فیلدهای اجباری پروژه تکمیل نشده‌اند', 'warning');
      return;
    }

    await qProjectCreate.run();
    const projectCode = qProjectCreate.data?.data?.projectCode || inpProjectCode.text;
    await storeValue('activeProjectCode', String(projectCode).toUpperCase(), true);

    if (inpRepoRoot.text) {
      await qRepoCreate.run();
      await qRepoValidate.run();
    }

    showAlert('پروژه با موفقیت ثبت شد', 'success');
    await qProjectList.run();
  },

  async validateRepositoryAndSync() {
    if (!appsmith.store.activeProjectCode) {
      showAlert('ابتدا پروژه را انتخاب کنید', 'warning');
      return;
    }

    const key = `sync-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await storeValue('syncIdempotencyKey', key, false);

    await qProjectSync.run();
    const runId = qProjectSync.data?.data?.workflowRun?.id;

    if (runId) {
      await storeValue('activeRunId', runId, false);
      showAlert(`Sync شروع شد. RunId: ${runId}`, 'info');
    } else {
      showAlert('Sync اجرا شد', 'success');
    }
  }
};
