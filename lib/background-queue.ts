import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';

export interface BackgroundTask {
  name: string;
  execute: () => Promise<void>;
}

export class BackgroundQueue {
  static enqueue(request: NextRequest, task: BackgroundTask): void {
    const promise = BackgroundQueue.executeTask(task);
    
    try {
      // Use Vercel's waitUntil for both Edge and Node.js runtimes
      waitUntil(promise);
      console.log(`[BackgroundQueue] Task "${task.name}" enqueued via Vercel waitUntil`);
    } catch (error) {
      // Fallback for local development where Vercel APIs aren't available
      console.warn(`[BackgroundQueue] Vercel waitUntil not available (local dev), executing task "${task.name}" without blocking`);
      promise.catch((err) => {
        console.error(`[BackgroundQueue] Background task "${task.name}" failed:`, err);
      });
    }
  }

  private static async executeTask(task: BackgroundTask): Promise<void> {
    const start = Date.now();
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), taskName: task.name, event: 'start' }));
    try {
      await task.execute();
      console.log(JSON.stringify({ timestamp: new Date().toISOString(), taskName: task.name, event: 'success', durationMs: Date.now() - start }));
    } catch (err: any) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), taskName: task.name, event: 'failure', durationMs: Date.now() - start, error: { message: err.message, stack: err.stack } }));
    }
  }
}
