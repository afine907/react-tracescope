/**
 * Node Content Component
 * Displays the actual content of a trace node with streaming animation
 * Supports code highlighting and markdown rendering
 */

import React, { useMemo, useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import type { NodeStatus } from '../types/node';

// Dynamic import types
type MarkedModule = typeof import('marked');
type HljsModule = typeof import('highlight.js');

export interface NodeContentProps {
  content: string;
  status?: NodeStatus;
  nodeType?: string;
  className?: string;
  enableMarkdown?: boolean;
  enableHighlight?: boolean;
}

/**
 * NodeContent Component
 * Renders node content with streaming state handling
 * Supports code highlighting and markdown rendering
 * Uses DOMPurify to prevent XSS attacks
 */
export function NodeContent({
  content,
  status = 'streaming',
  nodeType = '',
  className = '',
  enableMarkdown = true,
  enableHighlight = true,
}: NodeContentProps): JSX.Element {
  const codeRef = useRef<HTMLElement>(null);

  // Dynamic imports for marked and hljs
  const [marked, setMarked] = useState<MarkedModule | null>(null);
  const [hljs, setHljs] = useState<HljsModule | null>(null);

  useEffect(() => {
    Promise.all([
      import('marked'),
      import('highlight.js')
    ]).then(([markedMod, hljsMod]) => {
      markedMod.marked.setOptions({
        gfm: true,
        breaks: true,
      });
      setMarked(markedMod);
      setHljs(hljsMod);
    });
  }, []);

  // Configure DOMPurify for link safety
  useEffect(() => {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });

    return () => {
      DOMPurify.removeHook('afterSanitizeAttributes');
    };
  }, []);

  const isStreaming = status === 'streaming';
  const hasContent = content && content.length > 0;

  // Format content based on node type
  const formattedContent = useMemo(() => {
    if (!hasContent) return null;

    const isCode = nodeType === 'code_execution' ||
                   nodeType === 'tool_call' ||
                   /^(import|export|const|let|var|function|class|def|public|private|interface|type|enum)/m.test(content);

    const isMarkdown = enableMarkdown && (
      content.includes('#') ||
      content.includes('```') ||
      content.includes('**') ||
      content.includes('[]')
    );

    return {
      text: content,
      isCode,
      isMarkdown: isMarkdown && !isCode,
    };
  }, [content, hasContent, nodeType, enableMarkdown]);

  // Apply syntax highlighting
  useEffect(() => {
    if (codeRef.current && formattedContent?.isCode && enableHighlight && hljs) {
      hljs.default.highlightElement(codeRef.current);
    }
  }, [content, formattedContent?.isCode, enableHighlight, hljs]);

  // Render markdown with XSS protection
  const renderedMarkdown = useMemo(() => {
    if (formattedContent?.isMarkdown && enableMarkdown && marked) {
      try {
        const rawHtml = marked.marked(content) as string;
        return DOMPurify.sanitize(rawHtml, {
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
      } catch (e) {
        console.warn('[TraceScope] Markdown render failed:', e);
        return DOMPurify.sanitize(content);
      }
    }
    return null;
  }, [content, formattedContent?.isMarkdown, enableMarkdown, marked]);

  return (
    <div className={`ts-content ${className}`}>
      {/* Streaming placeholder */}
      {isStreaming && !hasContent && (
        <span className="ts-streaming-dots">
          <span className="ts-streaming-dot" style={{ animationDelay: '0s' }}>.</span>
          <span className="ts-streaming-dot" style={{ animationDelay: '0.2s' }}>.</span>
          <span className="ts-streaming-dot" style={{ animationDelay: '0.4s' }}>.</span>
        </span>
      )}

      {/* Code content with highlighting */}
      {hasContent && formattedContent?.isCode && (
        <pre className="ts-content-code">
          <code
            ref={codeRef}
            className={`language-javascript ${enableHighlight ? 'hljs' : ''}`}
          >
            {formattedContent.text}
          </code>
        </pre>
      )}

      {/* Markdown content - SANITIZED */}
      {hasContent && renderedMarkdown && (
        <div
          className="ts-content-markdown"
          dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
        />
      )}

      {/* Plain text content */}
      {hasContent && !formattedContent?.isCode && !renderedMarkdown && (
        <pre className="ts-content-text">
          {formattedContent?.text}
        </pre>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="ts-content-error">
          <span>⚠️</span>
          <span>Execution failed</span>
        </div>
      )}
    </div>
  );
}

export default NodeContent;
