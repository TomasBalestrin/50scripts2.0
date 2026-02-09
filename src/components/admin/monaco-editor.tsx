'use client';

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { WrapText, Hash, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'markdown' | 'json' | 'text';
  height?: string;
  readOnly?: boolean;
  placeholder?: string;
}

export function MonacoEditor({
  value,
  onChange,
  language = 'text',
  height = '300px',
  readOnly = false,
  placeholder,
}: MonacoEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [wordWrap, setWordWrap] = useState(true);
  const [focused, setFocused] = useState(false);

  const lineCount = useMemo(() => {
    return (value || '').split('\n').length;
  }, [value]);

  const charCount = useMemo(() => {
    return (value || '').length;
  }, [value]);

  const wordCount = useMemo(() => {
    const trimmed = (value || '').trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [value]);

  // Sync scroll between textarea and line numbers
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Handle Tab key to insert spaces
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (readOnly) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        const newValue =
          value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);

        // Restore cursor position after React re-render
        requestAnimationFrame(() => {
          textarea.selectionStart = start + 2;
          textarea.selectionEnd = start + 2;
        });
      }

      // Auto-indent on Enter
      if (e.key === 'Enter') {
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const currentLine = value.substring(0, start).split('\n').pop() || '';
        const indent = currentLine.match(/^(\s*)/)?.[1] || '';

        if (indent) {
          e.preventDefault();
          const newValue =
            value.substring(0, start) + '\n' + indent + value.substring(start);
          onChange(newValue);

          requestAnimationFrame(() => {
            const newPos = start + 1 + indent.length;
            textarea.selectionStart = newPos;
            textarea.selectionEnd = newPos;
          });
        }
      }
    },
    [value, onChange, readOnly]
  );

  // Generate line numbers
  const lineNumbers = useMemo(() => {
    const lines = [];
    for (let i = 1; i <= Math.max(lineCount, 1); i++) {
      lines.push(i);
    }
    return lines;
  }, [lineCount]);

  // Highlighted overlay content
  const highlightedContent = useMemo(() => {
    if (!value) return '';

    let html = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Highlight template variables {{VAR_NAME}} in accent color
    html = html.replace(
      /\{\{([^}]+)\}\}/g,
      '<span style="color: #1D4ED8; font-weight: 600;">{{$1}}</span>'
    );

    // Language-specific highlighting
    if (language === 'json') {
      // Highlight JSON keys
      html = html.replace(
        /(&quot;|")([^"]+)(&quot;|")\s*:/g,
        '<span style="color: #7C3AED;">"$2"</span>:'
      );
      // Highlight strings
      html = html.replace(
        /:\s*(&quot;|")([^"]+)(&quot;|")/g,
        ': <span style="color: #10B981;">"$2"</span>'
      );
      // Highlight numbers
      html = html.replace(
        /:\s*(\d+\.?\d*)/g,
        ': <span style="color: #F59E0B;">$1</span>'
      );
      // Highlight booleans and null
      html = html.replace(
        /:\s*(true|false|null)/g,
        ': <span style="color: #3B82F6;">$1</span>'
      );
    }

    if (language === 'markdown') {
      // Highlight headers
      html = html.replace(
        /^(#{1,6}\s.+)$/gm,
        '<span style="color: #7C3AED; font-weight: 600;">$1</span>'
      );
      // Highlight bold
      html = html.replace(
        /\*\*(.+?)\*\*/g,
        '<span style="color: #F59E0B; font-weight: 700;">**$1**</span>'
      );
      // Highlight inline code
      html = html.replace(
        /`([^`]+)`/g,
        '<span style="color: #10B981; background: rgba(16,185,129,0.1); padding: 0 2px; border-radius: 2px;">`$1`</span>'
      );
    }

    // Trailing newline so the overlay matches textarea height
    html += '\n';

    return html;
  }, [value, language]);

  // Keep overlay scroll in sync
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('scroll', handleScroll);
      return () => textarea.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div className="rounded-lg border border-[#131B35] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-[#0A0F1E] px-3 py-1.5 border-b border-[#131B35]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setWordWrap((w) => !w)}
            className={`h-6 px-2 text-xs ${
              wordWrap ? 'text-[#1D4ED8]' : 'text-gray-500'
            } hover:text-white`}
            title={wordWrap ? 'Desativar quebra de linha' : 'Ativar quebra de linha'}
          >
            <WrapText className="h-3 w-3 mr-1" />
            Wrap
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="relative flex" style={{ height }}>
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="flex-shrink-0 overflow-hidden bg-[#0A0F1E] select-none border-r border-[#131B35]"
          style={{ width: '48px' }}
        >
          <div className="py-2">
            {lineNumbers.map((num) => (
              <div
                key={num}
                className="px-2 text-right font-mono text-xs leading-[20px] text-gray-600"
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        {/* Editor Content Area */}
        <div className="relative flex-1 overflow-hidden">
          {/* Syntax Highlight Overlay */}
          <div
            className="pointer-events-none absolute inset-0 overflow-auto py-2 px-3 font-mono text-sm leading-[20px] text-transparent"
            style={{
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
              wordBreak: wordWrap ? 'break-all' : 'normal',
              overflowWrap: wordWrap ? 'break-word' : 'normal',
            }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />

          {/* Actual Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onScroll={handleScroll}
            readOnly={readOnly}
            placeholder={placeholder}
            spellCheck={false}
            className="absolute inset-0 w-full h-full resize-none bg-[#131B35] py-2 px-3 font-mono text-sm leading-[20px] text-gray-200 placeholder:text-gray-600 focus:outline-none caret-[#1D4ED8]"
            style={{
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
              wordBreak: wordWrap ? 'break-all' : 'normal',
              overflowWrap: wordWrap ? 'break-word' : 'normal',
              color: 'rgba(209, 213, 219, 0.85)',
              caretColor: '#1D4ED8',
            }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between bg-[#0A0F1E] px-3 py-1 border-t border-[#131B35]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <Hash className="h-3 w-3" />
            {lineCount} {lineCount === 1 ? 'linha' : 'linhas'}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <Type className="h-3 w-3" />
            {charCount} chars
          </span>
          <span className="text-[10px] text-gray-500">
            {wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {focused && (
            <span className="text-[10px] text-gray-600">
              Tab = 2 espacos
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
