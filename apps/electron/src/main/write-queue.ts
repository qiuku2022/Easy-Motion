/**
 * 写入队列
 * 按项目 ID 序列化写入操作，确保并发安全
 */
export class WriteQueue {
  private queues: Map<string, Promise<unknown>> = new Map();

  /**
   * 将任务加入指定项目的写入队列
   * 同一项目的任务按顺序串行执行
   */
  async enqueue<T>(projectId: string, task: () => Promise<T>): Promise<T> {
    const existing = this.queues.get(projectId);

    const newPromise = (async (): Promise<T> => {
      // 等待前一个任务完成
      if (existing) {
        try {
          await existing;
        } catch {
          // 前一个任务出错不影响后续任务
        }
      }

      // 执行当前任务
      return await task();
    })();

    this.queues.set(projectId, newPromise);

    try {
      const result = await newPromise;
      return result;
    } finally {
      // 清理已完成的队列项
      const current = this.queues.get(projectId);
      if (current === newPromise) {
        this.queues.delete(projectId);
      }
    }
  }

  /**
   * 获取项目当前的队列状态
   */
  isQueued(projectId: string): boolean {
    return this.queues.has(projectId);
  }

  /**
   * 等待指定项目的所有任务完成
   */
  async drain(projectId: string): Promise<void> {
    const existing = this.queues.get(projectId);
    if (existing) {
      await existing.catch(() => {});
    }
  }
}
