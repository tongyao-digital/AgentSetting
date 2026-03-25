import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '../src/App';

describe('App', () => {
  it('renders main title and module tabs', () => {
    render(<App />);

    expect(screen.getByText('Ability Management Console')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '分类管理' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '能力管理' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '同步任务' })).toBeInTheDocument();
  });
});
