class SyncRepository {
  constructor(initialJobs = []) {
    this.jobs = [...initialJobs];
  }

  list() {
    return [...this.jobs];
  }

  hasRunningJob() {
    return this.jobs.some((item) => item.status === 'running');
  }

  createRunningJob() {
    const nextId = String(this.jobs.length + 1);
    const job = {
      id: nextId,
      job_type: 'incremental',
      status: 'running',
      started_at: new Date().toISOString(),
      ended_at: null,
      success_count: '0',
      fail_count: '0',
      error_summary: null,
      cursor_token: null,
    };
    this.jobs.push(job);
    return job;
  }
}

module.exports = {
  SyncRepository,
};

