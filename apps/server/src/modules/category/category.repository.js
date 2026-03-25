class CategoryRepository {
  constructor(initialCategories = []) {
    this.categories = [...initialCategories];
  }

  list() {
    return [...this.categories].sort((a, b) => Number(a.sort) - Number(b.sort));
  }

  create(input) {
    const normalizedName = input.name.trim().toLowerCase();
    const exists = this.categories.some((item) => item.normalized_name === normalizedName);
    if (exists) {
      return { kind: 'duplicate' };
    }

    const nextId = String(this.categories.length + 1);
    const item = {
      id: nextId,
      name: input.name,
      normalized_name: normalizedName,
      sort: input.sort,
      is_builtin: '0',
      is_deleted: '0',
      version: '1',
    };
    this.categories.push(item);
    return { kind: 'ok', data: item };
  }

  update(id, input) {
    const index = this.categories.findIndex((item) => item.id === id);
    if (index < 0) {
      return { kind: 'not_found' };
    }

    const current = this.categories[index];
    if (String(current.version) !== String(input.version)) {
      return { kind: 'version_conflict' };
    }

    const nextVersion = String(Number(current.version) + 1);
    const next = {
      ...current,
      name: input.name,
      normalized_name: input.name.trim().toLowerCase(),
      sort: input.sort,
      version: nextVersion,
    };

    this.categories[index] = next;
    return { kind: 'ok', data: next };
  }

  delete(id) {
    const index = this.categories.findIndex((item) => item.id === id);
    if (index < 0) {
      return { kind: 'not_found' };
    }

    this.categories.splice(index, 1);
    return { kind: 'ok', data: { id } };
  }
}

module.exports = {
  CategoryRepository,
};

