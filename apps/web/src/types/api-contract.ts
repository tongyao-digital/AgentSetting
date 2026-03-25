/**
 * API interface type definitions
 *
 * Source of truth:
 * - docs/TECH_SPEC.md
 * - docs/learning/ability-management-prd-supplement.md
 * - CLAUDE.md
 */

/**
 * number-string rule:
 * - regex: ^[0-9]+$
 * - leading zero is allowed
 */
export type NumberString = string;

export const NUMBER_STRING_REGEX = /^[0-9]+$/;

export type TinyintFlag = 0 | 1 | "0" | "1";

export type ApiCode =
  | "0"
  | "CAP_4001"
  | "CAP_4002"
  | "CAP_4003"
  | "CAP_4004"
  | "CAP_4005"
  | "CAP_4006"
  | "CAP_4091"
  | "CAP_5001"
  | "CAP_5002";

export type ApiErrorCode = Exclude<ApiCode, "0">;

export interface ApiSuccess<T> {
  code: "0";
  message: "ok";
  data: T;
  request_id: string;
}

export interface ApiFailure {
  code: ApiErrorCode;
  message: string;
  request_id: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export const API_HTTP_STATUS_BY_CODE: Record<ApiCode, number> = {
  "0": 200,
  CAP_4001: 400,
  CAP_4002: 409,
  CAP_4003: 404,
  CAP_4004: 409,
  CAP_4005: 409,
  CAP_4006: 400,
  CAP_4091: 409,
  CAP_5001: 502,
  CAP_5002: 500,
};

export interface PageQuery {
  page: NumberString;
  page_size: NumberString;
}

export interface PageResult<T> {
  list: T[];
  total: NumberString;
  page: NumberString;
  page_size: NumberString;
}

export type CapabilityType = "WX_APP" | "WX_FLOW" | "EXT_APP" | "EXT_FLOW";

export type ManualCapabilityType = Extract<CapabilityType, "EXT_APP" | "EXT_FLOW">;

export type CapabilitySource = "sync" | "manual";

export type SyncJobType = "incremental" | "full";

export type SyncJobStatus = "running" | "success" | "failed" | "partial";

export type HttpMethod = "GET" | "POST" | "HEAD" | "PATCH" | "PUT" | "DELETE";

export type HttpBodyType = "none" | "json" | "form-urlencoded" | "raw";

export type HttpKeyValue = Record<string, string>;

export interface CapabilityRequestConfig {
  method: HttpMethod;
  url: string;
  headers_json?: HttpKeyValue;
  query_json?: HttpKeyValue;
  body_type: HttpBodyType;
  body_json?: unknown;
  connect_timeout_ms: NumberString;
  read_timeout_ms: NumberString;
  write_timeout_ms: NumberString;
}

export interface CategoryItem {
  id: NumberString;
  name: string;
  normalized_name: string;
  sort: NumberString;
  is_builtin: TinyintFlag;
  is_deleted: TinyintFlag;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  version: NumberString;
}

export interface CapabilityItem {
  id: NumberString;
  capability_name: string;
  normalized_name: string;
  capability_type: CapabilityType;
  category_id: NumberString;
  source: CapabilitySource;
  external_id?: string | null;
  intro?: string | null;
  is_deleted: TinyintFlag;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  version: NumberString;
}

export interface CapabilityDetail extends CapabilityItem {
  request_config: CapabilityRequestConfig | null;
}

export interface SyncJobItem {
  id: NumberString;
  job_type: SyncJobType;
  status: SyncJobStatus;
  started_at: string;
  ended_at?: string | null;
  success_count: NumberString;
  fail_count: NumberString;
  error_summary?: string | null;
  cursor_token?: string | null;
}

export namespace CategoryAPI {
  export type ListQuery = Partial<PageQuery>;

  export interface ListData {
    list: CategoryItem[];
    total?: NumberString;
  }

  export type ListResponse = ApiResponse<ListData>;

  export interface CreateBody {
    name: string;
    sort: NumberString;
  }

  export type CreateResponse = ApiResponse<CategoryItem>;

  export interface UpdateParams {
    id: NumberString;
  }

  export interface UpdateBody {
    name: string;
    sort: NumberString;
    version: NumberString;
  }

  export type UpdateResponse = ApiResponse<CategoryItem>;

  export interface DeleteParams {
    id: NumberString;
  }

  export type DeleteResponse = ApiResponse<{ id: NumberString }>;
}

export namespace CapabilityAPI {
  export interface ListQuery extends Partial<PageQuery> {
    keyword?: string;
    capability_type?: CapabilityType;
  }

  export type ListData = PageResult<CapabilityItem>;

  export type ListResponse = ApiResponse<ListData>;

  export interface DetailParams {
    id: NumberString;
  }

  export type DetailResponse = ApiResponse<CapabilityDetail>;

  export interface CreateBody {
    capability_name: string;
    capability_type: ManualCapabilityType;
    category_id: NumberString;
    intro?: string;
    request_config: CapabilityRequestConfig;
  }

  export type CreateResponse = ApiResponse<CapabilityDetail>;

  export interface UpdateParams {
    id: NumberString;
  }

  export interface UpdateBody {
    capability_name?: string;
    capability_type?: CapabilityType;
    category_id?: NumberString;
    intro?: string;
    request_config?: CapabilityRequestConfig | null;
    version: NumberString;
  }

  export type UpdateResponse = ApiResponse<CapabilityDetail>;

  export interface DeleteParams {
    id: NumberString;
  }

  export type DeleteResponse = ApiResponse<{ id: NumberString }>;
}

export namespace SyncAPI {
  export type ListQuery = Partial<PageQuery>;

  export interface ListData {
    list: SyncJobItem[];
    total?: NumberString;
  }

  export type ListResponse = ApiResponse<ListData>;

  export type TriggerBody = Record<string, never>;

  export interface TriggerData {
    job_id: NumberString;
    status: SyncJobStatus;
  }

  export type TriggerResponse = ApiResponse<TriggerData>;
}
