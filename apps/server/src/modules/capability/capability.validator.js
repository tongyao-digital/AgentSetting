const { isNumberString } = require('../../common/validator');

const MANUAL_CAPABILITY_TYPES = new Set(['EXT_APP', 'EXT_FLOW']);
const HTTP_METHODS = new Set(['GET', 'POST', 'HEAD', 'PATCH', 'PUT', 'DELETE']);
const HTTP_BODY_TYPES = new Set(['none', 'json', 'form-urlencoded', 'raw']);
const HEADER_BLACKLIST = new Set(['host', 'content-length']);

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeCapabilityName(name) {
  return String(name).replace(/\s+/g, '').toLowerCase();
}

function isPrivateOrLoopbackHost(hostname) {
  const host = String(hostname).toLowerCase();
  if (host === 'localhost' || host === '::1') {
    return true;
  }

  const parts = host.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) {
    return false;
  }

  const [a, b] = parts.map(Number);
  if (a === 127) {
    return true;
  }
  if (a === 10) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }

  return false;
}

function isSafeHttpUrl(url) {
  if (typeof url !== 'string' || !url.trim()) {
    return false;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  return !isPrivateOrLoopbackHost(parsed.hostname);
}

function isValidTimeout(value) {
  if (!isNumberString(value)) {
    return false;
  }

  const ms = Number(value);
  return ms >= 1000 && ms <= 60000;
}

function validateRequestConfig(config) {
  if (!isRecord(config)) {
    return { kind: 'invalid_param' };
  }

  if (!HTTP_METHODS.has(String(config.method || ''))) {
    return { kind: 'invalid_param' };
  }
  if (!HTTP_BODY_TYPES.has(String(config.body_type || ''))) {
    return { kind: 'invalid_param' };
  }
  if (!isSafeHttpUrl(config.url)) {
    return { kind: 'invalid_url' };
  }

  if (!isValidTimeout(config.connect_timeout_ms)) {
    return { kind: 'invalid_param' };
  }
  if (!isValidTimeout(config.read_timeout_ms)) {
    return { kind: 'invalid_param' };
  }
  if (!isValidTimeout(config.write_timeout_ms)) {
    return { kind: 'invalid_param' };
  }

  if (config.headers_json != null) {
    if (!isRecord(config.headers_json)) {
      return { kind: 'invalid_param' };
    }

    const hasBlockedHeader = Object.keys(config.headers_json).some((key) =>
      HEADER_BLACKLIST.has(String(key).toLowerCase()),
    );
    if (hasBlockedHeader) {
      return { kind: 'invalid_param' };
    }
  }

  if (config.query_json != null && !isRecord(config.query_json)) {
    return { kind: 'invalid_param' };
  }

  return { kind: 'ok' };
}

function validateCreateCapabilityInput(input) {
  if (!isRecord(input)) {
    return { kind: 'invalid_param' };
  }

  const capabilityName = String(input.capability_name || '').trim();
  if (!capabilityName || capabilityName.length > 10) {
    return { kind: 'invalid_param' };
  }

  if (!MANUAL_CAPABILITY_TYPES.has(String(input.capability_type || ''))) {
    return { kind: 'invalid_param' };
  }

  if (!isNumberString(input.category_id)) {
    return { kind: 'invalid_param' };
  }

  if (input.intro != null) {
    if (typeof input.intro !== 'string' || input.intro.trim().length > 10) {
      return { kind: 'invalid_param' };
    }
  }

  const requestConfigResult = validateRequestConfig(input.request_config);
  if (requestConfigResult.kind !== 'ok') {
    return requestConfigResult;
  }

  return {
    kind: 'ok',
    data: {
      capability_name: capabilityName,
      normalized_name: normalizeCapabilityName(capabilityName),
      capability_type: String(input.capability_type),
      category_id: String(input.category_id),
      intro: input.intro == null ? null : String(input.intro).trim() || null,
      request_config: input.request_config,
    },
  };
}

module.exports = {
  normalizeCapabilityName,
  validateCreateCapabilityInput,
};

