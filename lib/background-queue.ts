import { NextRequest } from 'next/server';

export interface BackgroundTask {
  name: string;
  execute: () => Promise<void>;
}

export class BackgroundQueue {
  static enqueue(request: NextRequest, task: BackgroundTask): void {
    const promise = BackgroundQueue.executeTask(task);
    if (typeof (request as any).waitUntil === 'function') {
      (request as any).waitUntil(promise);
    } else {
      // Graceful degradation: execute without waitUntil (e.g. local dev)
      promise.catch(() => {});
    }
  }

  private static async executeTask(task: BackgroundTask): Promise<void> {
    const start = Date.now();
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), taskName: task.name, event: 'start' }));
    try {
      const result = await task.execute();
      console.log(JSON.stringify({ timestamp: new Date().toISOString(), taskName: task.name, event: 'success', durationMs: Date.now() - start, result: result ?? null }));
    } catch (err: any) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), taskName: task.name, event: 'failure', durationMs: Date.now() - start, error: { message: err.message, stack: err.stack } }));
    }
  }
}
