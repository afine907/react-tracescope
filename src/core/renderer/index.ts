/**
 * Renderer Engine
 * Handles incremental rendering with debouncing and change detection
 */

import type { RenderOptions, RenderEvent } from '../../types/config';

/**
 * Renderer class
 * Manages render queue with debouncing for optimal performance
 */
export class Renderer {
  private options: Required<RenderOptions>;
  private queue: Map<string, RenderEvent> = new Map();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private flushCallbacks: ((events: RenderEvent[]) => void)[] = [];
  private renderCount = 0;
  private lastFlushTime = 0;

  /**
   * Create a new Renderer instance
   * @param options - Render configuration options
   */
  constructor(options: RenderOptions = {}) {
    this.options = {
      debounceMs: options.debounceMs ?? 50,
      maxNodesBeforeDegrade: options.maxNodesBeforeDegrade ?? 1000,
      incremental: options.incremental ?? true,
    };
  }

  /**
   * Schedule a render event
   * @param event - Render event to schedule
   */
  scheduleRender(event: RenderEvent): void {
    // For update events, always use the latest
    if (event.type === 'updated' || event.type === 'created') {
      this.queue.set(event.nodeId, event);
    } else {
      // For delete, remove from queue if present
      this.queue.delete(event.nodeId);
    }

    // Schedule debounced flush
    this.scheduleFlush();
  }

  /**
   * Schedule flush with debouncing
   */
  private scheduleFlush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flush();
    }, this.options.debounceMs);
  }

  /**
   * Flush all queued render events
   */
  flush(): void {
    if (this.queue.size === 0) {
      return;
    }

    const events = Array.from(this.queue.values());
    this.queue.clear();
    this.renderCount++;
    this.lastFlushTime = Date.now();

    // Notify all registered callbacks
    for (const callback of this.flushCallbacks) {
      try {
        callback(events);
      } catch (error) {
        console.error('[Renderer] Callback error:', error);
      }
    }
  }

  /**
   * Force immediate flush of all pending events
   */
  flushImmediate(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.flush();
  }

  /**
   * Register a flush callback
   * @param callback - Function to call when events are flushed
   * @returns Unsubscribe function
   */
  onFlush(callback: (events: RenderEvent[]) => void): () => void {
    this.flushCallbacks.push(callback);
    
    return () => {
      const index = this.flushCallbacks.indexOf(callback);
      if (index > -1) {
        this.flushCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Set debounce delay
   * @param ms - Debounce delay in milliseconds
   */
  setDebounce(ms: number): void {
    this.options.debounceMs = Math.max(0, ms);
  }

  /**
   * Get current debounce setting
   * @returns Debounce delay in milliseconds
   */
  getDebounce(): number {
    return this.options.debounceMs;
  }

  /**
   * Get render statistics
   * @returns Object with render count and timing info
   */
  getStats(): { renderCount: number; lastFlushTime: number; pendingCount: number } {
    return {
      renderCount: this.renderCount,
      lastFlushTime: this.lastFlushTime,
      pendingCount: this.queue.size,
    };
  }

  /**
   * Get number of pending render events
   * @returns Number of events in queue
   */
  getPendingCount(): number {
    return this.queue.size;
  }

  /**
   * Check if renderer has pending work
   * @returns true if there are pending events
   */
  hasPending(): boolean {
    return this.queue.size > 0;
  }

  /**
   * Clear all pending render events
   */
  clear(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.queue.clear();
  }

  /**
   * Update render options
   * @param options - New render options
   */
  setOptions(options: Partial<RenderOptions>): void {
    if (options.debounceMs !== undefined) {
      this.options.debounceMs = Math.max(0, options.debounceMs);
    }
    if (options.maxNodesBeforeDegrade !== undefined) {
      this.options.maxNodesBeforeDegrade = options.maxNodesBeforeDegrade;
    }
    if (options.incremental !== undefined) {
      this.options.incremental = options.incremental;
    }
  }

  /**
   * Get current options
   * @returns Current render options
   */
  getOptions(): Readonly<Required<RenderOptions>> {
    return { ...this.options };
  }
}

