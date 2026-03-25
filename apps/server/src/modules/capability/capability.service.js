const { validateCreateCapabilityInput } = require('./capability.validator');

class CapabilityService {
  constructor(capabilityRepository, categoryRepository) {
    this.capabilityRepository = capabilityRepository;
    this.categoryRepository = categoryRepository;
  }

  createCapability(input) {
    const validation = validateCreateCapabilityInput(input);
    if (validation.kind !== 'ok') {
      return validation;
    }

    const categoryExists = this.categoryRepository
      .list()
      .some((item) => String(item.id) === validation.data.category_id && String(item.is_deleted || '0') !== '1');

    if (!categoryExists) {
      return { kind: 'category_not_found' };
    }

    return this.capabilityRepository.create(validation.data);
  }

  listCapabilities(query = {}) {
    const list = this.capabilityRepository.list(query);
    return {
      list,
      total: String(list.length),
      page: '1',
      page_size: String(list.length || 10),
    };
  }

  updateCapability(id, input) {
    return this.capabilityRepository.update(id, input);
  }

  deleteCapability(id) {
    return this.capabilityRepository.delete(id);
  }
}

module.exports = {
  CapabilityService,
};

