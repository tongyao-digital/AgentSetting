class SyncService {
  constructor(syncRepository) {
    this.syncRepository = syncRepository;
  }

  trigger() {
    if (this.syncRepository.hasRunningJob()) {
      return { kind: 'running_conflict' };
    }

    const job = this.syncRepository.createRunningJob();
    return {
      kind: 'ok',
      data: {
        job_id: job.id,
        status: job.status,
      },
    };
  }

  listJobs() {
    const list = this.syncRepository.list();
    return {
      list,
      total: String(list.length),
    };
  }
}

module.exports = {
  SyncService,
};

