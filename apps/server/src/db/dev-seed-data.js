const defaultCategories = [
  {
    id: '1',
    name: '外部应用',
    normalized_name: '外部应用',
    sort: '10',
    is_builtin: '1',
    is_deleted: '0',
    version: '1',
  },
  {
    id: '2',
    name: '外部工作流',
    normalized_name: '外部工作流',
    sort: '20',
    is_builtin: '1',
    is_deleted: '0',
    version: '1',
  },
  {
    id: '3',
    name: '自定义能力',
    normalized_name: '自定义能力',
    sort: '30',
    is_builtin: '0',
    is_deleted: '0',
    version: '1',
  },
];

const defaultCapabilities = [
  {
    id: '1',
    capability_name: '天气查询',
    normalized_name: '天气查询',
    capability_type: 'EXT_APP',
    category_id: '1',
    source: 'manual',
    intro: '查询天气',
    request_config: {
      method: 'GET',
      url: 'https://api.example.com/weather',
      body_type: 'none',
      connect_timeout_ms: '3000',
      read_timeout_ms: '10000',
      write_timeout_ms: '10000',
    },
    is_deleted: '0',
    version: '1',
  },
  {
    id: '2',
    capability_name: '新闻搜索',
    normalized_name: '新闻搜索',
    capability_type: 'EXT_APP',
    category_id: '1',
    source: 'manual',
    intro: '搜索新闻',
    request_config: {
      method: 'GET',
      url: 'https://api.example.com/news',
      body_type: 'none',
      connect_timeout_ms: '3000',
      read_timeout_ms: '10000',
      write_timeout_ms: '10000',
    },
    is_deleted: '0',
    version: '1',
  },
  {
    id: '3',
    capability_name: '问学天气',
    normalized_name: '问学天气',
    capability_type: 'WX_APP',
    category_id: '3',
    source: 'sync',
    intro: '同步能力',
    request_config: null,
    is_deleted: '0',
    version: '1',
  },
  {
    id: '4',
    capability_name: '日报汇总',
    normalized_name: '日报汇总',
    capability_type: 'EXT_FLOW',
    category_id: '2',
    source: 'manual',
    intro: '日报流程',
    request_config: {
      method: 'POST',
      url: 'https://flow.example.com/report',
      body_type: 'json',
      body_json: {
        range: 'today',
      },
      connect_timeout_ms: '3000',
      read_timeout_ms: '10000',
      write_timeout_ms: '10000',
    },
    is_deleted: '0',
    version: '1',
  },
];

const defaultSyncJobs = [];

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getDefaultSeedData() {
  return {
    categories: deepClone(defaultCategories),
    capabilities: deepClone(defaultCapabilities),
    syncJobs: deepClone(defaultSyncJobs),
  };
}

module.exports = {
  getDefaultSeedData,
};

