import type { FlowEvent } from './types';

/** Format timestamp to HH:MM:SS */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

/** Copy text to clipboard with fallback for non-HTTPS */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error('[AgentFlow] Failed to copy:', err);
    return false;
  }
}

export const EVENT_DOT_COLORS: Record<FlowEvent['type'], string> = {
  start: '#3b82f6',
  thinking: '#8b5cf6',
  tool_call: '#f59e0b',
  tool_result: '#10b981',
  message: '#06b6d4',
  error: '#ef4444',
  end: '#10b981',
};

/** Generate a one-line summary for the collapsed timeline view */
export function getSummary(event: FlowEvent): string {
  switch (event.type) {
    case 'message':
      return event.message?.split('\n')[0]?.slice(0, 80) ?? '';
    case 'tool_call':
      return event.tool + (event.args?.path ? ` ${event.args.path}` : '');
    case 'tool_result':
      return event.result?.split('\n')[0]?.slice(0, 80) ?? '';
    case 'error':
      return event.message?.split('\n')[0]?.slice(0, 80) ?? 'Error';
    case 'thinking':
      return event.message?.split('\n')[0]?.slice(0, 80) ?? 'Thinking...';
    default:
      return event.type;
  }
}
