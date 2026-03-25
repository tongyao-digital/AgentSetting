class CapabilityController {
  constructor(capabilityService) {
    this.capabilityService = capabilityService;
  }

  create(body) {
    return this.capabilityService.createCapability(body);
  }

  list(query) {
    return this.capabilityService.listCapabilities(query);
  }

  update(id, body) {
    return this.capabilityService.updateCapability(id, body);
  }

  delete(id) {
    return this.capabilityService.deleteCapability(id);
  }
}

module.exports = {
  CapabilityController,
};

