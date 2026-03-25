class CategoryService {
  constructor(categoryRepository) {
    this.categoryRepository = categoryRepository;
  }

  listCategories() {
    const list = this.categoryRepository.list();
    return {
      list,
      total: String(list.length),
    };
  }

  createCategory(input) {
    return this.categoryRepository.create(input);
  }

  updateCategory(id, input) {
    return this.categoryRepository.update(id, input);
  }

  deleteCategory(id) {
    return this.categoryRepository.delete(id);
  }
}

module.exports = {
  CategoryService,
};

