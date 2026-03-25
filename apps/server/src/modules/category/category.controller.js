class CategoryController {
  constructor(categoryService) {
    this.categoryService = categoryService;
  }

  getList() {
    return this.categoryService.listCategories();
  }

  create(body) {
    return this.categoryService.createCategory(body);
  }

  update(id, body) {
    return this.categoryService.updateCategory(id, body);
  }

  delete(id) {
    return this.categoryService.deleteCategory(id);
  }
}

module.exports = {
  CategoryController,
};

