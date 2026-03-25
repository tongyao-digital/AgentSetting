const { normalizeCapabilityName } = require('./capability.validator');

class CapabilityRepository {
  constructor(initialCapabilities = []) {
    this.capabilities = [...initialCapabilities];
  }

  create(input) {
    const normalizedName = input.normalized_name || normalizeCapabilityName(input.capability_name);
    const duplicate = this.capabilities.some(
      (item) =>
        item.is_deleted !== '1' &&
        String(item.category_id) === String(input.category_id) &&
        String(item.normalized_name || '').toLowerCase() === normalizedName,
    );

    if (duplicate) {
      return { kind: 'duplicate' };
    }

    const maxId = this.capabilities.reduce((acc, item) => {
      const currentId = Number(item.id);
      return Number.isFinite(currentId) ? Math.max(acc, currentId) : acc;
    }, 0);
    const nextId = String(maxId + 1);

    const item = {
      id: nextId,
      capability_name: input.capability_name,
      normalized_name: normalizedName,
      capability_type: input.capability_type,
      category_id: input.category_id,
      source: 'manual',
      intro: input.intro || null,
      request_config: input.request_config,
      is_deleted: '0',
      version: '1',
    };

    this.capabilities.push(item);
    return { kind: 'ok', data: item };
  }

  list(query = {}) {
    let list = [...this.capabilities].filter((item) => item.is_deleted !== '1');

    if (query.keyword) {
      const keyword = String(query.keyword).toLowerCase();
      list = list.filter((item) => item.capability_name.toLowerCase().includes(keyword));
    }

    if (query.capability_type) {
      list = list.filter((item) => item.capability_type === query.capability_type);
    }

    return list;
  }

  update(id, input) {
    const index = this.capabilities.findIndex((item) => item.id === id);
    if (index < 0) {
      return { kind: 'not_found' };
    }

    const current = this.capabilities[index];
    if (current.source === 'sync') {
      return { kind: 'readonly' };
    }

    if (String(current.version) !== String(input.version)) {
      return { kind: 'version_conflict' };
    }

    const typeChanged = input.capability_type && input.capability_type !== current.capability_type;
    const next = {
      ...current,
      ...input,
      version: String(Number(current.version) + 1),
    };

    if (typeChanged) {
      next.request_config = null;
    }

    this.capabilities[index] = next;
    return { kind: 'ok', data: next };
  }

  delete(id) {
    const index = this.capabilities.findIndex((item) => item.id === id);
    if (index < 0) {
      return { kind: 'not_found' };
    }

    const current = this.capabilities[index];
    if (current.source === 'sync') {
      return { kind: 'readonly' };
    }

    this.capabilities[index] = {
      ...current,
      is_deleted: '1',
      version: String(Number(current.version) + 1),
    };

    return { kind: 'ok', data: { id } };
  }
}

module.exports = {
  CapabilityRepository,
};

