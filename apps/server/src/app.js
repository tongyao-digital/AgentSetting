const { randomUUID } = require('node:crypto');

const { sendJson, parseJsonBody } = require('./common/response');
const { isNumberString } = require('./common/validator');
const { CategoryRepository } = require('./modules/category/category.repository');
const { CategoryService } = require('./modules/category/category.service');
const { CategoryController } = require('./modules/category/category.controller');
const { CapabilityRepository } = require('./modules/capability/capability.repository');
const { CapabilityService } = require('./modules/capability/capability.service');
const { CapabilityController } = require('./modules/capability/capability.controller');
const { SyncRepository } = require('./modules/sync/sync.repository');
const { SyncService } = require('./modules/sync/sync.service');
const { SyncController } = require('./modules/sync/sync.controller');
const { getDefaultSeedData } = require('./db/dev-seed-data');

function getCategoryIdFromPath(pathname) {
  const match = /^\/api\/v1\/ability-management\/categories\/([0-9]+)$/.exec(pathname);
  return match ? match[1] : null;
}

function getCapabilityIdFromPath(pathname) {
  const match = /^\/api\/v1\/ability-management\/capabilities\/([0-9]+)$/.exec(pathname);
  return match ? match[1] : null;
}

function hasOwn(options, key) {
  return Object.prototype.hasOwnProperty.call(options, key);
}

function sendValidationError(res) {
  sendJson(res, 400, {
    code: 'CAP_4001',
    message: '参数不合法',
    request_id: randomUUID(),
  });
}

function createApp(options = {}) {
  const seed = getDefaultSeedData();
  const useSeed = Object.keys(options).length === 0;

  const categories = hasOwn(options, 'categories') ? options.categories : useSeed ? seed.categories : [];
  const capabilities = hasOwn(options, 'capabilities') ? options.capabilities : useSeed ? seed.capabilities : [];
  const syncJobs = hasOwn(options, 'syncJobs') ? options.syncJobs : useSeed ? seed.syncJobs : [];

  const categoryRepository = new CategoryRepository(categories || []);
  const categoryService = new CategoryService(categoryRepository);
  const categoryController = new CategoryController(categoryService);

  const capabilityRepository = new CapabilityRepository(capabilities || []);
  const capabilityService = new CapabilityService(capabilityRepository, categoryRepository);
  const capabilityController = new CapabilityController(capabilityService);

  const syncRepository = new SyncRepository(syncJobs || []);
  const syncService = new SyncService(syncRepository);
  const syncController = new SyncController(syncService);

  return function app(req, res) {
    (async () => {
      const requestUrl = new URL(req.url || '/', 'http://localhost');
      const pathname = requestUrl.pathname;

      if (req.method === 'GET' && pathname === '/api/v1/ability-management/categories') {
        const data = categoryController.getList();
        sendJson(res, 200, {
          code: '0',
          message: 'ok',
          data,
          request_id: randomUUID(),
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/ability-management/categories') {
        const body = await parseJsonBody(req);
        if (!isNumberString(body.sort)) {
          sendValidationError(res);
          return;
        }

        const result = categoryController.create(body);
        if (result.kind === 'duplicate') {
          sendJson(res, 409, {
            code: 'CAP_4002',
            message: '名称已存在',
            request_id: randomUUID(),
          });
          return;
        }

        sendJson(res, 200, {
          code: '0',
          message: 'ok',
          data: result.data,
          request_id: randomUUID(),
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/ability-management/capabilities') {
        const data = capabilityController.list({
          keyword: requestUrl.searchParams.get('keyword') || undefined,
          capability_type: requestUrl.searchParams.get('capability_type') || undefined,
        });

        sendJson(res, 200, {
          code: '0',
          message: 'ok',
          data,
          request_id: randomUUID(),
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/ability-management/capabilities') {
        const body = await parseJsonBody(req);
        const result = capabilityController.create(body);

        if (result.kind === 'invalid_param') {
          sendJson(res, 400, {
            code: 'CAP_4001',
            message: '参数不合法',
            request_id: randomUUID(),
          });
          return;
        }

        if (result.kind === 'duplicate') {
          sendJson(res, 409, {
            code: 'CAP_4002',
            message: '名称已存在',
            request_id: randomUUID(),
          });
          return;
        }

        if (result.kind === 'category_not_found') {
          sendJson(res, 404, {
            code: 'CAP_4003',
            message: '分类已失效，请刷新',
            request_id: randomUUID(),
          });
          return;
        }

        if (result.kind === 'invalid_url') {
          sendJson(res, 400, {
            code: 'CAP_4006',
            message: 'URL 不在允许范围',
            request_id: randomUUID(),
          });
          return;
        }

        sendJson(res, 200, {
          code: '0',
          message: 'ok',
          data: result.data,
          request_id: randomUUID(),
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/v1/ability-management/sync-jobs') {
        const data = syncController.list();
        sendJson(res, 200, {
          code: '0',
          message: 'ok',
          data,
          request_id: randomUUID(),
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/v1/ability-management/sync-jobs/trigger') {
        await parseJsonBody(req);
        const result = syncController.trigger();

        if (result.kind === 'running_conflict') {
          sendJson(res, 409, {
            code: 'CAP_4091',
            message: '并发冲突',
            request_id: randomUUID(),
          });
          return;
        }

        sendJson(res, 200, {
          code: '0',
          message: 'ok',
          data: result.data,
          request_id: randomUUID(),
        });
        return;
      }

      const capabilityId = getCapabilityIdFromPath(pathname);
      if (req.method === 'PUT' && capabilityId) {
        const body = await parseJsonBody(req);
        const result = capabilityController.update(capabilityId, body);

        if (result.kind === 'not_found') {
          sendJson(res, 404, {
            code: 'CAP_4003',
            message: '资源不存在',
            request_id: randomUUID(),
          });
          return;
        }

        if (result.kind === 'version_conflict') {
          sendJson(res, 409, {
            code: 'CAP_4091',
            message: '并发冲突',
            request_id: randomUUID(),
          });
          return;
        }

        if (result.kind === 'readonly') {
          sendJson(res, 409, {
            code: 'CAP_4004',
            message: '同步能力不支持此操作',
            request_id: randomUUID(),
          });
          return;
        }

        sendJson(res, 200, {
          code: '0',
          message: 'ok',
          data: result.data,
          request_id: randomUUID(),
        });
        return;
      }

      if (req.method === 'DELETE' && capabilityId) {
        const result = capabilityController.delete(capabilityId);

        if (result.kind === 'readonly') {
          sendJson(res, 409, {
            code: 'CAP_4004',
            message: '同步能力不支持此操作',
            request_id: randomUUID(),
          });
          return;
        }

        if (result.kind === 'not_found') {
          sendJson(res, 200, {
            code: '0',
            message: 'ok',
            data: { id: capabilityId },
            request_id: randomUUID(),
          });
          return;
        }

        sendJson(res, 200, {
          code: '0',
          message: 'ok',
          data: result.data,
          request_id: randomUUID(),
        });
        return;
      }

      const categoryId = getCategoryIdFromPath(pathname);
      if (req.method === 'PUT' && categoryId) {
        const body = await parseJsonBody(req);
        const result = categoryController.update(categoryId, body);

        if (result.kind === 'not_found') {
          sendJson(res, 404, {
            code: 'CAP_4003',
            message: '资源不存在',
            request_id: randomUUID(),
          });
          return;
        }

        if (result.kind === 'version_conflict') {
          sendJson(res, 409, {
            code: 'CAP_4091',
            message: '并发冲突',
            request_id: randomUUID(),
          });
          return;
        }

        sendJson(res, 200, {
          code: '0',
          message: 'ok',
          data: result.data,
          request_id: randomUUID(),
        });
        return;
      }

      if (req.method === 'DELETE' && categoryId) {
        const hasCapabilities = capabilityRepository
          .list()
          .some((item) => String(item.category_id) === String(categoryId));
        if (hasCapabilities) {
          sendJson(res, 409, {
            code: 'CAP_4005',
            message: '分类下存在能力，无法删除',
            request_id: randomUUID(),
          });
          return;
        }

        const result = categoryController.delete(categoryId);

        if (result.kind === 'not_found') {
          sendJson(res, 404, {
            code: 'CAP_4003',
            message: '资源不存在',
            request_id: randomUUID(),
          });
          return;
        }

        sendJson(res, 200, {
          code: '0',
          message: 'ok',
          data: result.data,
          request_id: randomUUID(),
        });
        return;
      }

      sendJson(res, 404, {
        code: 'CAP_4003',
        message: '资源不存在',
        request_id: randomUUID(),
      });
    })().catch(() => {
      sendJson(res, 500, {
        code: 'CAP_5002',
        message: '同步任务异常',
        request_id: randomUUID(),
      });
    });
  };
}

module.exports = {
  createApp,
};

