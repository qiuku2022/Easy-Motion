import { describe, it, expect } from 'vitest';
import { IPC_CHANNELS, DEFAULT_FPS } from '../constants';

describe('Constants', () => {
  it('IPC_CHANNELS 应该包含 PROJECT 频道', () => {
    expect(IPC_CHANNELS.PROJECT.CREATE).toBe('main:project:create');
    expect(IPC_CHANNELS.PROJECT.OPEN).toBe('main:project:open');
  });

  it('DEFAULT_FPS 应该为 30', () => {
    expect(DEFAULT_FPS).toBe(30);
  });
});
