import React, { useEffect, useRef, useState } from 'react';
import { Unlock, Check, Calendar, Clock, Code, Eye, FileText, GitFork, AlertTriangle } from 'lucide-react';
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

export const PasteContent: React.FC<PasteContentProps> = ({ decryptedPaste, onFork }) => {
  const [rawCopied, setRawCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  // Trigger Syntax Highlight when content is ready
  useEffect(() => {
    if (decryptedPaste && codeRef.current && typeof Prism !== 'undefined') {
      Prism.highlightElement(codeRef.current);
    }
  }, [decryptedPaste]);

  const handleCopyRaw = () => {
    if (decryptedPaste) {
      navigator.clipboard.writeText(decryptedPaste.text);
      setRawCopied(true);
      setTimeout(() => setRawCopied(false), 2000);
    }
  };

  const handleFork = () => {
    if (decryptedPaste) {
      onFork(decryptedPaste.text, decryptedPaste.language || 'plaintext');
    }
  };

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(ts));
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-white/5 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-900/10 rounded border border-brand-900/20">
              <Unlock className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Decrypted Payload</h1>
              <div className="text-xs text-gray-500 font-mono">
                {decryptedPaste.text.length.toLocaleString()} bytes
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={handleFork}
              className="text-xs h-8 border border-white/5 bg-bg-surface hover:bg-white/5 mr-2"
            >
              <GitFork className="w-3 h-3 mr-2" />
              Fork
            </Button>
            <Button
              variant="ghost"
              onClick={handleCopyRaw}
              className="text-xs h-8 border border-white/5 bg-bg-surface hover:bg-white/5"
            >
              {rawCopied ? <Check className="w-3 h-3 mr-2 text-green-400" /> : <FileText className="w-3 h-3 mr-2" />}
              {rawCopied ? 'Copied' : 'Copy Raw'}
            </Button>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-bg-surface rounded border border-white/5">
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-gray-600" />
            <div>
              <div className="text-[10px] font-mono text-gray-600 uppercase">Created</div>
              <div className="text-xs text-gray-400">{formatDate(decryptedPaste.createdAt)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-gray-600" />
            <div>
              <div className="text-[10px] font-mono text-gray-600 uppercase">Expires</div>
              <div className="text-xs text-gray-400">
                {decryptedPaste.expiresAt ? formatDate(decryptedPaste.expiresAt) : 'Never'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Code className="w-3 h-3 text-gray-600" />
            <div>
              <div className="text-[10px] font-mono text-gray-600 uppercase">Language</div>
              <div className="text-xs text-gray-400 capitalize">
                {decryptedPaste.language || 'Plain Text'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-3 h-3 text-gray-600" />
            <div>
              <div className="text-[10px] font-mono text-gray-600 uppercase">Views</div>
              <div className="text-xs text-gray-400">{decryptedPaste.views}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative group">
        <pre className="w-full min-h-[50vh] max-h-[70vh] overflow-auto bg-bg-surface p-6 rounded-lg border border-white/5 selection:bg-brand-900 selection:text-white scrollbar-thin">
          <code ref={codeRef} className={`language-${decryptedPaste.language || 'plaintext'}`}>
            {decryptedPaste.text}
          </code>
        </pre>
        {decryptedPaste.burnAfterRead && (
          <div className="absolute top-4 right-4 bg-brand-900/20 border border-brand-900/30 text-brand-500 px-2 py-1 rounded text-[10px] font-mono flex items-center gap-2 uppercase tracking-wider backdrop-blur-sm">
            <AlertTriangle className="w-3 h-3" />
            Burned
          </div>
        )}
      </div>
    </div>
  );
};
