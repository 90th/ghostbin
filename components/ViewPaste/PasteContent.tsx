import { Component, createSignal, createEffect, Show } from 'solid-js';
import { Unlock, Check, Calendar, Clock, Code, Eye, FileText, GitFork, AlertTriangle } from 'lucide-solid';
import { Button } from '../Button';
import { DecryptedPaste } from '../../types';
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

interface PasteContentProps {
  decryptedPaste: DecryptedPaste;
  onFork: (content: string, language: string) => void;
}

export const PasteContent: Component<PasteContentProps> = (props) => {
  const [rawCopied, setRawCopied] = createSignal(false);
  let codeRef: HTMLElement | undefined;

  // Trigger Syntax Highlight when content is ready
  createEffect(() => {
    if (props.decryptedPaste && codeRef && typeof Prism !== 'undefined') {
      Prism.highlightElement(codeRef);
    }
  });

  const handleCopyRaw = () => {
    if (props.decryptedPaste) {
      navigator.clipboard.writeText(props.decryptedPaste.text);
      setRawCopied(true);
      setTimeout(() => setRawCopied(false), 2000);
    }
  };

  const handleFork = () => {
    if (props.decryptedPaste) {
      props.onFork(props.decryptedPaste.text, props.decryptedPaste.language || 'plaintext');
    }
  };

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(ts));
  };

  return (
    <div class="space-y-6">
      <div class="border-b border-white/5 pb-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-brand-900/10 rounded border border-brand-900/20">
              <Unlock class="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h1 class="text-lg font-bold text-white">Decrypted Payload</h1>
              <div class="text-xs text-gray-500 font-mono">
                {props.decryptedPaste.text.length.toLocaleString()} bytes
              </div>
            </div>
          </div>
          <div class="flex items-center">
            <Button
              variant="ghost"
              onClick={handleFork}
              class="text-xs h-8 border border-white/5 bg-bg-surface hover:bg-white/5 mr-2"
            >
              <GitFork class="w-3 h-3 mr-2" />
              Fork
            </Button>
            <Button
              variant="ghost"
              onClick={handleCopyRaw}
              class="text-xs h-8 border border-white/5 bg-bg-surface hover:bg-white/5"
            >
              <Show when={rawCopied()} fallback={<FileText class="w-3 h-3 mr-2" />}>
                <Check class="w-3 h-3 mr-2 text-green-400" />
              </Show>
              {rawCopied() ? 'Copied' : 'Copy Raw'}
            </Button>
          </div>
        </div>

        {/* Metadata Grid */}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-bg-surface rounded border border-white/5">
          <div class="flex items-center gap-2">
            <Calendar class="w-3 h-3 text-gray-600" />
            <div>
              <div class="text-[10px] font-mono text-gray-600 uppercase">Created</div>
              <div class="text-xs text-gray-400">{formatDate(props.decryptedPaste.createdAt)}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Clock class="w-3 h-3 text-gray-600" />
            <div>
              <div class="text-[10px] font-mono text-gray-600 uppercase">Expires</div>
              <div class="text-xs text-gray-400">
                {props.decryptedPaste.expiresAt ? formatDate(props.decryptedPaste.expiresAt) : 'Never'}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Code class="w-3 h-3 text-gray-600" />
            <div>
              <div class="text-[10px] font-mono text-gray-600 uppercase">Language</div>
              <div class="text-xs text-gray-400 capitalize">
                {props.decryptedPaste.language || 'Plain Text'}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Eye class="w-3 h-3 text-gray-600" />
            <div>
              <div class="text-[10px] font-mono text-gray-600 uppercase">Views</div>
              <div class="text-xs text-gray-400">{props.decryptedPaste.views}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="relative group">
        <pre class="w-full min-h-[50vh] max-h-[70vh] overflow-auto bg-bg-surface p-6 rounded-lg border border-white/5 selection:bg-brand-900 selection:text-white scrollbar-thin">
          <code ref={codeRef} class={`language-${props.decryptedPaste.language || 'plaintext'}`}>
            {props.decryptedPaste.text}
          </code>
        </pre>
        <Show when={props.decryptedPaste.burnAfterRead}>
          <div class="absolute top-4 right-4 bg-brand-900/20 border border-brand-900/30 text-brand-500 px-2 py-1 rounded text-[10px] font-mono flex items-center gap-2 uppercase tracking-wider backdrop-blur-sm">
            <AlertTriangle class="w-3 h-3" />
            Burned
          </div>
        </Show>
      </div>
    </div>
  );
};
