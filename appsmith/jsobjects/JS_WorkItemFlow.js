export default {
  async createWorkItem() {
    if (!appsmith.store.activeProjectCode) {
      showAlert('ابتدا پروژه فعال را انتخاب کنید', 'warning');
      return;
    }

    await qWorkItemCreate.run();
    await qWorkItemList.run();

    const id = qWorkItemCreate.data?.data?.id;
    if (id) {
      await storeValue('activeWorkItemId', id, false);
    }

    showAlert('Work Item ثبت شد', 'success');
  },

  async startResearch() {
    const key = `wi-research-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await storeValue('workItemActionKey', key, false);
    await qWorkItemResearchStart.run();
    await qWorkItemList.run();
    showAlert('Research flow شروع شد', 'info');
  },

  async startSpec() {
    const key = `wi-spec-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await storeValue('workItemActionKey', key, false);
    await qWorkItemSpecStart.run();
    await qWorkItemList.run();
    showAlert('Spec generation flow شروع شد', 'info');
  },

  async submitApproval(decision) {
    await selApprovalDecision.setSelectedOption(decision);
    await qWorkItemApproval.run();
    await qWorkItemList.run();
    showAlert('Human approval ثبت شد', 'success');
  },

  async submitMemoryCommit() {
    await qWorkItemMemoryCommit.run();
    await qWorkItemList.run();
    await qMemoryCommits.run();
    showAlert('Memory commit ثبت و Work Item تکمیل شد', 'success');
  }
};
