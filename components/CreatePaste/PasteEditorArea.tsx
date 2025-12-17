import { Component, createSignal, onMount, createMemo, Show } from 'solid-js';
import { Upload } from 'lucide-solid';
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

const EDITOR_STYLES = {
  "font-family": '"JetBrains Mono", monospace',
  "font-size": '14px',
  "font-weight": 400,
  "line-height": '24px',
  "letter-spacing": '0px',
  padding: '20px',
  "tab-size": 4,
  "white-space": 'pre',
  "overflow-wrap": 'normal',
  "word-break": 'normal',
  "font-variant-ligatures": 'none',
};

interface PasteEditorAreaProps {
  content: string;
  setContent: (content: string) => void;
  language: string;
}

export const PasteEditorArea: Component<PasteEditorAreaProps> = (props) => {
  const [fontsLoaded, setFontsLoaded] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);
  let preRef: HTMLPreElement | undefined;

  onMount(() => {
    document.fonts.ready.then(() => {
      setFontsLoaded(true);
    });
  });

  const highlightedCode = createMemo(() => {
    let html = '';
    if (typeof Prism === 'undefined' || props.language === 'plaintext') {
      html = props.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    } else {
      const grammar = Prism.languages[props.language];
      if (!grammar) {
        html = props.content
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      } else {
        html = Prism.highlight(props.content, grammar, props.language);
      }
    }

    if (props.content.endsWith('\n')) {
      html += '<br/>';
    }

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['span', 'code', 'pre', 'br', 'div'],
      ALLOWED_ATTR: ['class', 'style', 'data-language']
    });
  });

  const handleScroll = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    if (preRef) {
      preRef.scrollTop = target.scrollTop;
      preRef.scrollLeft = target.scrollLeft;
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget && (e.currentTarget as Node).contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer?.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          props.setContent(text);
        }
      };
      try {
        reader.readAsText(file);
      } catch (err) {
        console.error("Failed to read file", err);
      }
    }
  };

  return (
    <div
      class={cn(
        "relative group flex-grow flex flex-col bg-bg-surface rounded-lg border overflow-hidden transition-colors",
        isDragging() ? "border-brand-500 ring-1 ring-brand-500" : "border-white/5 hover:border-white/10"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      <Show when={!fontsLoaded()}>
        <div class="absolute inset-0 flex items-center justify-center bg-bg-surface z-30">
          <div class="animate-pulse text-gray-600 text-sm font-mono">Loading editor...</div>
        </div>
      </Show>

      <pre
        ref={preRef}
        aria-hidden="true"
        class={cn("absolute inset-0 w-full h-full m-0 overflow-hidden pointer-events-none select-none text-left", !fontsLoaded() ? 'opacity-0' : 'opacity-100')}
        style={EDITOR_STYLES}
      >
        <code
          class={`language-${props.language}`}
          style={{
            "font-family": 'inherit',
            "font-size": 'inherit',
            "line-height": 'inherit',
            "white-space": 'inherit',
            display: 'inline-block',
            direction: 'ltr',
            padding: 0,
            margin: 0,
            border: 'none',
            background: 'transparent',
            "box-shadow": 'none'
          }}
          innerHTML={highlightedCode()}
        />
      </pre>

      <textarea
        value={props.content}
        onInput={(e) => props.setContent(e.currentTarget.value)}
        onScroll={handleScroll}
        placeholder="Type your secret message..."
        class={cn("absolute inset-0 w-full h-full bg-transparent text-transparent caret-white resize-none focus:outline-none placeholder:text-gray-700 z-10 overflow-auto", !fontsLoaded() ? 'opacity-0' : 'opacity-100')}
        style={EDITOR_STYLES}
        spellcheck={false}
        wrap="off"
        autocapitalize="off"
        autocomplete="off"
        autocorrect="off"
        autofocus
      />

      <div class="absolute bottom-2 right-8 text-[10px] text-gray-700 font-mono pointer-events-none z-20 bg-bg-surface/80 px-2 rounded">
        {props.content.length} chars
      </div>

      <Show when={isDragging()}>
        <div class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg-surface/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div class="p-6 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4">
            <Upload class="w-10 h-10 text-brand-500" />
          </div>
          <p class="text-lg font-bold text-white tracking-tight">Drop file to paste</p>
          <p class="text-xs text-gray-500 font-mono mt-2 uppercase tracking-wider">Text files only</p>
        </div>
      </Show>
    </div>
  );
};
