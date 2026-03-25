import type { CapabilitySource, CapabilityType } from '../types/api-contract';

const CAPABILITY_TYPE_LABELS: Record<CapabilityType, string> = {
  WX_APP: '问学应用',
  WX_FLOW: '问学工作流',
  EXT_APP: '外部应用',
  EXT_FLOW: '外部工作流',
};

export function getCapabilityTypeLabel(type: string): string {
  if (type in CAPABILITY_TYPE_LABELS) {
    return CAPABILITY_TYPE_LABELS[type as CapabilityType];
  }

  return `未知类型(${type})`;
}

export function canEditCapability(source: CapabilitySource): boolean {
  return source !== 'sync';
}

export function canDeleteCapability(source: CapabilitySource): boolean {
  return source !== 'sync';
}

export const MANUAL_CAPABILITY_TYPE_OPTIONS = [
  { label: CAPABILITY_TYPE_LABELS.EXT_APP, value: 'EXT_APP' },
  { label: CAPABILITY_TYPE_LABELS.EXT_FLOW, value: 'EXT_FLOW' },
] as const;

export const CAPABILITY_TYPE_OPTIONS = [
  { label: CAPABILITY_TYPE_LABELS.WX_APP, value: 'WX_APP' },
  { label: CAPABILITY_TYPE_LABELS.WX_FLOW, value: 'WX_FLOW' },
  { label: CAPABILITY_TYPE_LABELS.EXT_APP, value: 'EXT_APP' },
  { label: CAPABILITY_TYPE_LABELS.EXT_FLOW, value: 'EXT_FLOW' },
] as const;
