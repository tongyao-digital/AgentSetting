import type {
  CapabilityAPI,
  CapabilityRequestConfig,
  CapabilityType,
  HttpMethod,
  ManualCapabilityType,
} from '../types/api-contract';

export type CapabilityFormValue = {
  capability_name: string;
  capability_type: CapabilityType;
  category_id: string;
  intro?: string;
  method: HttpMethod;
  url: string;
};

const DEFAULT_TIMEOUT = {
  connect_timeout_ms: '3000',
  read_timeout_ms: '10000',
  write_timeout_ms: '10000',
} as const;

export function isManualCapabilityType(type: CapabilityType): type is ManualCapabilityType {
  return type === 'EXT_APP' || type === 'EXT_FLOW';
}

export function buildRequestConfigFromForm(values: CapabilityFormValue): CapabilityRequestConfig {
  return {
    method: values.method,
    url: values.url,
    body_type: 'none',
    ...DEFAULT_TIMEOUT,
  };
}

export function buildCapabilityCreateBody(values: CapabilityFormValue): CapabilityAPI.CreateBody {
  if (!isManualCapabilityType(values.capability_type)) {
    throw new Error('only manual capability type can be created');
  }

  return {
    capability_name: values.capability_name.trim(),
    capability_type: values.capability_type,
    category_id: values.category_id,
    intro: values.intro?.trim() || undefined,
    request_config: buildRequestConfigFromForm(values),
  };
}

export function buildCapabilityUpdateBody(
  values: CapabilityFormValue,
  current: { version: string; capability_type: CapabilityType },
): { body: CapabilityAPI.UpdateBody; typeChanged: boolean } {
  const typeChanged = values.capability_type !== current.capability_type;

  return {
    typeChanged,
    body: {
      capability_name: values.capability_name.trim(),
      capability_type: values.capability_type,
      category_id: values.category_id,
      intro: values.intro?.trim() || undefined,
      request_config: typeChanged ? null : buildRequestConfigFromForm(values),
      version: current.version,
    },
  };
}
