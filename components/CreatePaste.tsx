import React, { useRef, useLayoutEffect, useState, useCallback } from 'react';
import { Lock, Flame, Code, Copy, ExternalLink, KeyRound, ChevronRight, Clock, Dices, Eye, EyeOff, Check, Link, Upload } from 'lucide-react';
import { Button } from './Button';
import { usePasteCreation } from '../hooks/usePasteCreation';
import { cn } from '../lib/utils';
import { LANGUAGE_OPTIONS } from '../lib/constants';
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

const EXPIRATION_OPTIONS = [
  { label: '1 Hour', value: 60 * 60 * 1000 },
  { label: '1 Day', value: 24 * 60 * 60 * 1000 },
  { label: '1 Week', value: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Never', value: 0 },
];

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

interface CreatePasteProps {
  initialData?: {
    content: string;
    language: string;
  } | null;
}

export const CreatePaste: React.FC<CreatePasteProps> = ({ initialData }) => {
  const {
    content, setContent,
    password, setPassword,
    isProcessing,
    burnAfterRead, setBurnAfterRead,
    expiration, setExpiration,
    language, setLanguage,
    shareUrl,
    error,
    showPassword, setShowPassword,
    handleEncrypt,
    handleReset,
    handleGeneratePassword
  } = usePasteCreation({ initialData });

  const [copied, setCopied] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [receiptPasswordVisible, setReceiptPasswordVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const preRef = useRef<HTMLPreElement>(null);

  useLayoutEffect(() => {
    document.fonts.ready.then(() => {
      setFontsLoaded(true);
    });
  }, []);

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyPasswordToClipboard = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    }
  };

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

  if (shareUrl) {
    const expirationLabel = EXPIRATION_OPTIONS.find(o => o.value === expiration)?.label || 'Custom';

    return (
      <div className="max-w-lg mx-auto mt-12 p-0 rounded-xl border border-white/10 bg-bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-brand-900/10 border-b border-white/5 p-6 text-center">
          <div className="w-12 h-12 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-brand-500/30">
            <Check className="w-6 h-6 text-brand-400" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Encryption Successful</h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Link className="w-3 h-3" /> Shareable Link (Onion)
            </label>
            <div className="relative group">
              <div className="w-full bg-bg-dark border border-black/20 rounded-md py-3 pl-3 pr-12 font-mono text-sm text-gray-300 truncate select-all">
                {shareUrl}
              </div>
              <button
                onClick={copyToClipboard}
                className="absolute right-1 top-1 bottom-1 px-3 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                title="Copy Link"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {password && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <KeyRound className="w-3 h-3" /> Decryption Password
              </label>
              <div className="relative group">
                <input
                  type={receiptPasswordVisible ? "text" : "password"}
                  value={password}
                  readOnly
                  className="w-full bg-bg-dark border border-brand-900/20 rounded-md py-3 pl-3 pr-20 font-mono text-sm text-brand-200 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                />
                <div className="absolute right-1 top-1 bottom-1 flex gap-1">
                  <button
                    onClick={() => setReceiptPasswordVisible(!receiptPasswordVisible)}
                    className="w-8 flex items-center justify-center rounded hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
                    title={receiptPasswordVisible ? "Hide Password" : "Show Password"}
                  >
                    {receiptPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={copyPasswordToClipboard}
                    className="w-8 flex items-center justify-center rounded hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
                    title="Copy Password"
                  >
                    {passwordCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-red-400/80 font-mono mt-1">
                Save this now. It cannot be recovered.
              </p>
            </div>
          )}
        </div>

        <div className="bg-bg-dark/50 border-t border-white/5 p-4 flex items-center justify-between text-xs font-mono text-gray-500">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>Expires: {expirationLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className={cn("w-3 h-3", burnAfterRead ? 'text-brand-500' : 'text-gray-600')} />
            <span>Burn: {burnAfterRead ? 'Yes' : 'No'}</span>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-bg-surface">
          <Button variant="secondary" onClick={handleReset} icon={<ExternalLink className="w-4 h-4" />} className="w-full justify-center">
            Create New Paste
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] gap-4">
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

      <div className="relative flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-bg-surface p-2 rounded-lg border border-white/5">

        {error && (
          <div className="absolute bottom-full mb-2 left-0 right-0 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded text-sm text-center">
            {error}
          </div>
        )}

        <div className="relative flex-grow group min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <KeyRound className={cn("h-4 w-4 transition-colors", password ? 'text-brand-500' : 'text-gray-600 group-hover:text-gray-500')} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Optional Master Password"
            className="block w-full pl-10 pr-20 py-2 bg-bg-dark border border-transparent rounded text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:bg-bg-dark focus:ring-1 focus:ring-brand-900/50 transition-all font-mono"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1.5 text-gray-600 hover:text-brand-500 transition-colors rounded hover:bg-white/5"
              title={showPassword ? "Hide Password" : "Show Password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="p-1.5 text-gray-600 hover:text-brand-500 transition-colors rounded hover:bg-white/5"
              title="Generate Secure Password"
            >
              <Dices className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="hidden md:block w-px h-8 bg-white/5 mx-1"></div>

        <div className="relative min-w-[140px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Code className="h-4 w-4 text-gray-600" />
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 bg-bg-dark border border-transparent rounded text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-900/50 font-mono appearance-none cursor-pointer hover:bg-[#222]"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <ChevronRight className="h-3 w-3 text-gray-600 rotate-90" />
          </div>
        </div>

        <div className="relative min-w-[140px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Clock className="h-4 w-4 text-gray-600" />
          </div>
          <select
            value={expiration}
            onChange={(e) => setExpiration(Number(e.target.value))}
            className="block w-full pl-10 pr-3 py-2 bg-bg-dark border border-transparent rounded text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-900/50 font-mono appearance-none cursor-pointer hover:bg-[#222]"
          >
            {EXPIRATION_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <ChevronRight className="h-3 w-3 text-gray-600 rotate-90" />
          </div>
        </div>

        <label className="flex items-center justify-center gap-2 cursor-pointer px-3 py-2 rounded hover:bg-bg-dark transition-colors select-none border border-transparent hover:border-white/5 whitespace-nowrap">
          <input
            type="checkbox"
            checked={burnAfterRead}
            onChange={(e) => setBurnAfterRead(e.target.checked)}
            className="w-3 h-3 rounded-sm border-gray-600 bg-bg text-brand-600 focus:ring-brand-500/20 focus:ring-offset-0"
          />
          <span className={cn("text-xs font-mono uppercase tracking-wide", burnAfterRead ? 'text-brand-500' : 'text-gray-500')}>
            Burn
          </span>
          {burnAfterRead && <Flame className="w-3 h-3 text-brand-500" />}
        </label>

        <Button
          onClick={handleEncrypt}
          disabled={!content.trim()}
          isLoading={isProcessing}
          className="md:w-auto w-full min-w-[120px]"
        >
          Encrypt
        </Button>
      </div>
    </div>
  );
};