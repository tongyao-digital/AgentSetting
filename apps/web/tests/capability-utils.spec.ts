import { describe, expect, it } from 'vitest';

import { canDeleteCapability, canEditCapability, getCapabilityTypeLabel } from '../src/utils/capability';

describe('capability utils', () => {
  it('maps known capability type labels', () => {
    expect(getCapabilityTypeLabel('WX_APP')).toBe('问学应用');
    expect(getCapabilityTypeLabel('WX_FLOW')).toBe('问学工作流');
    expect(getCapabilityTypeLabel('EXT_APP')).toBe('外部应用');
    expect(getCapabilityTypeLabel('EXT_FLOW')).toBe('外部工作流');
  });

  it('falls back for unknown capability type', () => {
    expect(getCapabilityTypeLabel('FOO_BAR')).toBe('未知类型(FOO_BAR)');
  });

  it('enforces sync capability read-only', () => {
    expect(canEditCapability('manual')).toBe(true);
    expect(canDeleteCapability('manual')).toBe(true);
    expect(canEditCapability('sync')).toBe(false);
    expect(canDeleteCapability('sync')).toBe(false);
  });
});
