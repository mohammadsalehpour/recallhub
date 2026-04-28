export default {
  terminalStatuses: ['succeeded', 'failed', 'cancelled', 'timed_out', 'callback_missing'],

  async pollRun(runId, maxAttempts = 30, delayMs = 3000) {
    if (!runId) return;

    await storeValue('activeRunId', runId, false);

    for (let i = 0; i < maxAttempts; i++) {
      await qWorkflowRunGet.run();
      const run = qWorkflowRunGet.data?.data;

      if (this.stopOnTerminal(run?.status)) {
        showAlert(`Run ${runId} به وضعیت ${run.status} رسید`, 'info');
        await qWorkflowRunEvents.run();
        return run;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    showAlert('Polling timeout رسید. وضعیت run را دستی بررسی کنید.', 'warning');
    return null;
  },

  stopOnTerminal(status) {
    return this.terminalStatuses.includes(status);
  }
};
