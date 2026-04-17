/**
 * VirtualChat - Streaming Chat Component
 *
 * Features:
 * - Streaming output (typewriter effect)
 * - Token usage display
 * - Thinking process collapse
 * - Multi-turn conversation tree
 * - Code highlighting
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import DOMPurify from 'dompurify';

// Type imports
import type { ProtocolMessageData, ProtocolMessageRole, ProtocolContentType } from '../protocol/types';

// Dynamic import type definition
type MarkedModule = typeof import('marked');

// Config types
export interface VirtualChatConfig {
  showThinking?: boolean;
  showTokenUsage?: boolean;
  showTimestamp?: boolean;
  maxMessages?: number;
  avatars?: {
    user?: string;
    assistant?: string;
    system?: string;
    tool?: string;
  };
  onSendMessage?: (content: string) => void;
  onMessageRendered?: (messageId: string) => void;
}

// SSE streaming chat config
export interface StreamingChatConfig extends VirtualChatConfig {
  url: string;
  adapter?: string;
}

// ============================================
// Sub-component: Message Bubble
// ============================================

interface MessageBubbleProps {
  message: ProtocolMessageData;
  showThinking?: boolean;
  showTokenUsage?: boolean;
  showTimestamp?: boolean;
  avatar?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = memo(({
  message,
  showThinking = true,
  showTokenUsage = true,
  showTimestamp = true,
  avatar,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Dynamic import marked
  const [marked, setMarked] = useState<MarkedModule | null>(null);

  useEffect(() => {
    Promise.all([
      import('marked'),
      import('highlight.js')
    ]).then(([markedMod]) => {
      setMarked(markedMod);
    }).catch((err) => {
      console.warn('[VirtualChat] Failed to load markdown libraries:', err);
    });
  }, []);

  // Render Markdown / code
  const renderContent = useCallback((content: string, contentType: ProtocolContentType) => {
    if (!marked) {
      return <div className="whitespace-pre-wrap">{content}</div>;
    }

    if (contentType === 'code') {
      return (
        <pre><code className="hljs language-javascript">{content}</code></pre>
      );
    }

    if (contentType === 'markdown') {
      try {
        const rawHtml = marked.marked(content, { async: false }) as string;
        const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
          ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'hr',
            'ul', 'ol', 'li',
            'blockquote', 'pre', 'code',
            'a', 'strong', 'em', 'del', 'ins',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'img', 'span', 'div'
          ],
          ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
          ALLOW_DATA_ATTR: false,
        });
        return <div className="ts-chat-markdown" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
      } catch {
        return <div className="whitespace-pre-wrap">{content}</div>;
      }
    }

    return <div className="whitespace-pre-wrap">{content}</div>;
  }, [marked]);

  // Extract thinking process
  const extractThinking = useCallback((content: string): { thinking: string; content: string } | null => {
    const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/);
    if (thinkingMatch) {
      return {
        thinking: thinkingMatch[1].trim(),
        content: content.replace(thinkingMatch[0], '').trim(),
      };
    }
    return null;
  }, []);

  const role = message.role;
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';
  const isSystem = role === 'system';

  // Process thinking content
  const thinking = showThinking && isAssistant ? extractThinking(message.content) : null;
  const displayContent = thinking?.content || message.content;

  // Role name
  const roleName = {
    user: 'You',
    assistant: 'AI',
    system: 'System',
    tool: 'Tool',
  }[role] || role;

  // Format time
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    []
  );
  const formatTime = (timestamp: number) => {
    return timeFormatter.format(new Date(timestamp));
  };

  // Token stats
  const tokenInfo = message.tokensReceived ? (
    <span className="bg-[#e8f5e9] text-[#2e7d32] px-2 py-0.5 rounded-full text-[11px]">{message.tokensReceived} tokens</span>
  ) : null;

  return (
    <div className={`flex gap-3 mb-4 animate-fadeIn ${isUser ? 'flex-row-reverse' : ''} ${isSystem ? 'justify-center' : ''}`}>
      {/* Avatar */}
      {avatar && (
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
          <img src={avatar} alt={`${roleName} avatar`} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content area */}
      <div className={`flex flex-col max-w-[70%] min-w-[100px] ${isUser ? 'items-end' : ''}`}>
        {/* Role name */}
        <div className="flex items-center gap-2 mb-1 text-xs">
          <span className="font-semibold text-[#333]">{roleName}</span>
          {showTimestamp && (
            <span className="text-[#999]">{formatTime(message.createdAt)}</span>
          )}
        </div>

        {/* Thinking process (collapsible) */}
        {thinking && (
          <details className="ts-chat-thinking">
            <summary>💭 Thinking</summary>
            <div className="ts-chat-thinking-content">
              {renderContent(thinking.thinking, 'text')}
            </div>
          </details>
        )}

        {/* Message content */}
        <div
          ref={contentRef}
          className={
            isUser
              ? 'ts-chat-bubble-user'
              : isSystem
                ? 'ts-chat-bubble-system'
                : 'ts-chat-bubble-assistant'
          }
        >
          {renderContent(displayContent, message.contentType)}

          {/* Streaming cursor */}
          {message.isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-[#007aff] ml-0.5 animate-blink" aria-hidden="true">▊</span>
          )}
        </div>

        {/* Token usage */}
        {showTokenUsage && tokenInfo && (
          <div className="mt-1 text-[11px] text-[#999]">
            {tokenInfo}
          </div>
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

// ============================================
// Sub-component: Input Box
// ============================================

interface InputBoxProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const InputBox: React.FC<InputBoxProps> = memo(({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  // Send message
  const handleSend = useCallback(() => {
    const content = input.trim();
    if (content && !disabled) {
      onSend(content);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [input, disabled, onSend]);

  // Keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex gap-2 p-3 px-4 bg-white border-t border-[#eee]">
      <textarea
        ref={textareaRef}
        className="ts-chat-input placeholder:text-[#999]"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        aria-label="Message input"
      />
      <button
        className="ts-chat-send-btn"
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        aria-label="Send message"
      >
        Send
      </button>
    </div>
  );
});

InputBox.displayName = 'InputBox';

// ============================================
// Main Component: VirtualChat
// ============================================

interface VirtualChatProps {
  messages: ProtocolMessageData[];
  config?: VirtualChatConfig;
  className?: string;
  height?: number | string;
}

const DEFAULT_CHAT_CONFIG: VirtualChatConfig = {
  showThinking: true,
  showTokenUsage: true,
  showTimestamp: true,
  maxMessages: 100,
  avatars: {},
};

export const VirtualChat: React.FC<VirtualChatProps> = memo(({
  messages,
  config,
  className = '',
  height = 600,
}) => {
  const mergedConfig = { ...DEFAULT_CHAT_CONFIG, ...config };
  const {
    showThinking = true,
    showTokenUsage = true,
    showTimestamp = true,
    maxMessages = 100,
    avatars = {},
    onSendMessage,
    onMessageRendered: _onMessageRendered,
  } = mergedConfig;

  // Limit message count
  const displayMessages = messages.slice(-maxMessages);

  // Virtual list ref
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: displayMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  // Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    virtualizer.scrollToIndex(displayMessages.length - 1, { align: 'end' });
  }, [virtualizer, displayMessages.length]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (displayMessages.length > 0) {
      const lastMessage = displayMessages[displayMessages.length - 1];
      if (!lastMessage.isStreaming) {
        setTimeout(scrollToBottom, 100);
      }
    }
  }, [displayMessages.length, scrollToBottom]);

  // Smooth scroll for streaming messages
  useEffect(() => {
    const streamingMessage = displayMessages.find(m => m.isStreaming);
    if (streamingMessage) {
      const timeout = setTimeout(scrollToBottom, 500);
      return () => clearTimeout(timeout);
    }
  }, [displayMessages, scrollToBottom]);

  // Handle send message
  const handleSend = useCallback((content: string) => {
    if (onSendMessage) {
      onSendMessage(content);
    }
  }, [onSendMessage]);

  // Get avatar
  const getAvatar = (role: ProtocolMessageRole): string | undefined => {
    const avatarMap = {
      user: avatars.user,
      assistant: avatars.assistant,
      system: avatars.system,
      tool: avatars.tool,
    };
    return avatarMap[role];
  };

  // Total token stats
  const totalTokens = displayMessages.reduce((sum, m) => sum + (m.tokensReceived || 0), 0);

  return (
    <div
      className={`flex flex-col bg-white rounded-lg overflow-hidden font-sans ${className}`}
      style={{ height }}
    >
      {/* Message list */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto p-4 bg-[#f9f9f9]"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const message = displayMessages[virtualRow.index];
            return (
              <div
                key={message.messageId}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                data-index={virtualRow.index}
              >
                <MessageBubble
                  message={message}
                  showThinking={showThinking}
                  showTokenUsage={showTokenUsage}
                  showTimestamp={showTimestamp}
                  avatar={getAvatar(message.role)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Input box */}
      {onSendMessage && (
        <InputBox onSend={handleSend} />
      )}

      {/* Footer token stats */}
      {showTokenUsage && totalTokens > 0 && (
        <div className="p-2 px-4 bg-[#f5f5f5] border-t border-[#eee] text-xs text-[#666] text-center">
          <span className="bg-[#e3f2fd] text-[#1565c0] px-3 py-1 rounded-full">Total: {totalTokens} tokens</span>
        </div>
      )}
    </div>
  );
});

VirtualChat.displayName = 'VirtualChat';

// ============================================
// Convenience Component: SSE Streaming Chat
// ============================================

interface StreamingChatProps {
  url: string;
  adapter?: string;
  config?: VirtualChatConfig;
  height?: number | string;
}

export const StreamingChat: React.FC<StreamingChatProps> = memo(({
  url,
  adapter = 'custom',
  config,
  height = 600,
}) => {
  const [messages, setMessages] = useState<ProtocolMessageData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to SSE
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`${url}?adapter=${adapter}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'message') {
          setMessages(prev => {
            const existingIndex = prev.findIndex(m => m.messageId === data.message?.messageId);

            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                ...data.message,
                isStreaming: data.action === 'update',
              };
              return updated;
            } else {
              return [...prev, {
                ...data.message,
                isStreaming: data.action === 'update',
              }];
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError('Connection lost, retrying...');
      eventSource.close();

      setTimeout(connect, 3000);
    };
  }, [url, adapter]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Send message
  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: ProtocolMessageData = {
      messageId: `msg-${Date.now()}`,
      role: 'user',
      content,
      contentType: 'text',
      createdAt: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, adapter }),
      });
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  }, [url, adapter]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return (
    <div className="flex flex-col h-full">
      {/* Connection status */}
      <div className={`py-2 px-4 text-xs text-center ${isConnected ? 'text-[#4caf50]' : 'text-[#f44336]'}`}>
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      {/* Error message */}
      {error && <div className="py-2 px-4 bg-[#ffebee] text-[#c62828] text-xs text-center">{error}</div>}

      {/* Chat component */}
      <VirtualChat
        messages={messages}
        config={{
          ...config,
          onSendMessage: handleSendMessage,
        }}
        height={height}
      />
    </div>
  );
});

StreamingChat.displayName = 'StreamingChat';

export default VirtualChat;
