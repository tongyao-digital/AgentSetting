import { describe, expect, it } from 'vitest';

import {
  buildCapabilityCreateBody,
  buildCapabilityUpdateBody,
  buildRequestConfigFromForm,
} from '../src/utils/capability-form';

describe('capability form utils', () => {
  it('builds request config from form values', () => {
    const config = buildRequestConfigFromForm({
      capability_name: '天气查询',
      capability_type: 'EXT_APP',
      category_id: '1',
      method: 'GET',
      url: 'https://api.example.com/weather',
    });

    expect(config.url).toBe('https://api.example.com/weather');
    expect(config.method).toBe('GET');
    expect(config.connect_timeout_ms).toBe('3000');
  });

  it('clears request config when capability type changes on update', () => {
    const result = buildCapabilityUpdateBody(
      {
        capability_name: '天气查询',
        capability_type: 'EXT_FLOW',
        category_id: '1',
        method: 'POST',
        url: 'https://api.example.com/workflow',
      },
      {
        version: '2',
        capability_type: 'EXT_APP',
      },
    );

    expect(result.typeChanged).toBe(true);
    expect(result.body.request_config).toBeNull();
    expect(result.body.version).toBe('2');
  });

  it('allows create only for manual capability type', () => {
    expect(() =>
      buildCapabilityCreateBody({
        capability_name: '问学能力',
        capability_type: 'WX_APP',
        category_id: '1',
        method: 'GET',
        url: 'https://api.example.com/wx',
      }),
    ).toThrow('only manual capability type can be created');
  });
});
