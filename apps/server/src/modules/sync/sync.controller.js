class SyncController {
  constructor(syncService) {
    this.syncService = syncService;
  }

  trigger() {
    return this.syncService.trigger();
  }

  list() {
    return this.syncService.listJobs();
  }
}

module.exports = {
  SyncController,
};

