import React, { useRef, useLayoutEffect, useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '../../lib/utils';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-c';

const EDITOR_STYLES: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '14px',
  fontWeight: 400,
  lineHeight: '24px',
  letterSpacing: '0px',
  padding: '20px',
  tabSize: 4,
  whiteSpace: 'pre',
  overflowWrap: 'normal',
  wordBreak: 'normal',
  fontVariantLigatures: 'none',
};

interface PasteEditorAreaProps {
  content: string;
  setContent: (content: string) => void;
  language: string;
}

export const PasteEditorArea: React.FC<PasteEditorAreaProps> = ({
  content,
  setContent,
  language,
}) => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  useLayoutEffect(() => {
    document.fonts.ready.then(() => {
      setFontsLoaded(true);
    });
  }, []);

  const getHighlightedCode = () => {
    let html = '';
    if (typeof Prism === 'undefined' || language === 'plaintext') {
      html = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    } else {
      const grammar = Prism.languages[language];
      if (!grammar) {
        html = content
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      } else {
        html = Prism.highlight(content, grammar, language);
      }
    }

    if (content.endsWith('\n')) {
      html += '<br/>';
    }

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['span', 'code', 'pre', 'br', 'div'],
      ALLOWED_ATTR: ['class', 'style', 'data-language']
    });
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          setContent(text);
        }
      };
      try {
        reader.readAsText(file);
      } catch (err) {
        console.error("Failed to read file", err);
      }
    }
  }, [setContent]);

  return (
    <div 
      className={cn(
        "relative group flex-grow flex flex-col bg-bg-surface rounded-lg border overflow-hidden transition-colors",
        isDragging ? "border-brand-500 ring-1 ring-brand-500" : "border-white/5 hover:border-white/10"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      {!fontsLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-surface z-30">
          <div className="animate-pulse text-gray-600 text-sm font-mono">Loading editor...</div>
        </div>
      )}

      <pre
        ref={preRef}
        aria-hidden="true"
        className={cn("absolute inset-0 w-full h-full m-0 overflow-hidden pointer-events-none select-none text-left", !fontsLoaded ? 'opacity-0' : 'opacity-100')}
        style={EDITOR_STYLES}
      >
        <code
          className={`language-${language}`}
          style={{
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            whiteSpace: 'inherit',
            display: 'inline-block',
            direction: 'ltr',
            padding: 0,
            margin: 0,
            border: 'none',
            background: 'transparent',
            boxShadow: 'none'
          }}
          dangerouslySetInnerHTML={{ __html: getHighlightedCode() }}
        />
      </pre>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onScroll={handleScroll}
        placeholder="Type your secret message..."
        className={cn("absolute inset-0 w-full h-full bg-transparent text-transparent caret-white resize-none focus:outline-none placeholder:text-gray-700 z-10 overflow-auto", !fontsLoaded ? 'opacity-0' : 'opacity-100')}
        style={EDITOR_STYLES}
        spellCheck={false}
        wrap="off"
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        autoFocus
      />

      <div className="absolute bottom-2 right-8 text-[10px] text-gray-700 font-mono pointer-events-none z-20 bg-bg-surface/80 px-2 rounded">
        {content.length} chars
      </div>

      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg-surface/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="p-6 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4">
            <Upload className="w-10 h-10 text-brand-500" />
          </div>
          <p className="text-lg font-bold text-white tracking-tight">Drop file to paste</p>
          <p className="text-xs text-gray-500 font-mono mt-2 uppercase tracking-wider">Text files only</p>
        </div>
      )}
    </div>
  );
};
