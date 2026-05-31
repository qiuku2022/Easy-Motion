import { describe, it, expect } from 'vitest';
import { WriteQueue } from '../write-queue';

describe('WriteQueue', () => {
  it('应该串行执行同一项目的任务', async () => {
    const queue = new WriteQueue();
    const results: number[] = [];

    const task1 = queue.enqueue('project-1', async () => {
      results.push(1);
      await new Promise((resolve) => setTimeout(resolve, 50));
      results.push(2);
      return 'task1';
    });

    const task2 = queue.enqueue('project-1', async () => {
      results.push(3);
      return 'task2';
    });

    const [r1, r2] = await Promise.all([task1, task2]);

    expect(r1).toBe('task1');
    expect(r2).toBe('task2');
    expect(results).toEqual([1, 2, 3]); // 确保串行执行
  });

  it('不同项目应该并行执行', async () => {
    const queue = new WriteQueue();
    const startTimes: Record<string, number> = {};

    const task1 = queue.enqueue('project-1', async () => {
      startTimes['project-1'] = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'task1';
    });

    const task2 = queue.enqueue('project-2', async () => {
      startTimes['project-2'] = Date.now();
      return 'task2';
    });

    await Promise.all([task1, task2]);

    // project-2 应该在 project-1 完成前开始
    expect(startTimes['project-2']).toBeLessThan(startTimes['project-1'] + 100);
  });

  it('应该传播错误但继续后续任务', async () => {
    const queue = new WriteQueue();

    const task1 = queue.enqueue('project-1', async () => {
      throw new Error('task1 failed');
    });

    const task2 = queue.enqueue('project-1', async () => {
      return 'task2 succeeded';
    });

    await expect(task1).rejects.toThrow('task1 failed');
    await expect(task2).resolves.toBe('task2 succeeded');
  });

  it('isQueued 应该反映队列状态', async () => {
    const queue = new WriteQueue();

    expect(queue.isQueued('project-1')).toBe(false);

    const promise = queue.enqueue('project-1', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return 'done';
    });

    expect(queue.isQueued('project-1')).toBe(true);

    await promise;

    expect(queue.isQueued('project-1')).toBe(false);
  });
});
