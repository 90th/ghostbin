import React, { useState, useRef } from 'react';
import { Lock, Flame, Code, Copy, ExternalLink, KeyRound, ChevronRight, Clock } from 'lucide-react';
import { Button } from './Button';
import * as CryptoService from '../services/cryptoService';
import * as StorageService from '../services/storageService';
import { EncryptedPaste } from '../types';
import { v4 as uuidv4 } from 'uuid';
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

const LANGUAGE_OPTIONS = [
  { label: 'Plain Text', value: 'plaintext' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JSON', value: 'json' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'SQL', value: 'sql' },
  { label: 'Bash', value: 'bash' },
  { label: 'C/C++', value: 'c' },
];

// Shared styles to ensure perfect alignment between textarea and pre
// We use 'pre' (no wrapping) to avoid browser inconsistencies with scrollbar widths
const EDITOR_STYLES: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '14px',
  fontWeight: 400,
  lineHeight: '24px',
  letterSpacing: '0px',
  padding: '20px', // Reduced padding slightly for better fit
  tabSize: 4,
  whiteSpace: 'pre',
  overflowWrap: 'normal',
  wordBreak: 'normal',
};

export const CreatePaste: React.FC = () => {
  const [content, setContent] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [expiration, setExpiration] = useState<number>(24 * 60 * 60 * 1000); // Default 1 Day
  const [language, setLanguage] = useState<string>('plaintext');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preRef = useRef<HTMLPreElement>(null);

  const handleEncrypt = async () => {
    if (!content.trim()) return;

    setIsProcessing(true);
    setError(null);
    try {
      // 1. Generate Content Key
      const contentKey = await CryptoService.generateKey();

      // 2. Encrypt Content
      const { iv: contentIv, data: encryptedContent } = await CryptoService.encryptText(content, contentKey);

      // 3. Calculate Expiration
      const expiresAt = expiration > 0 ? Date.now() + expiration : undefined;

      // 4. Prepare payload
      const id = uuidv4();
      let payload: EncryptedPaste = {
        id,
        iv: contentIv,
        data: encryptedContent,
        createdAt: Date.now(),
        expiresAt,
        burnAfterRead,
        views: 0,
        language,
        hasPassword: false
      };

      let keyParam = '';

      if (password.trim()) {
        const salt = CryptoService.generateSalt();
        const wrapperKey = await CryptoService.deriveKeyFromPassword(password, salt);
        const contentKeyString = await CryptoService.exportKey(contentKey);
        const { iv: keyIv, data: encryptedKeyData } = await CryptoService.encryptText(contentKeyString, wrapperKey);

        payload.hasPassword = true;
        payload.salt = CryptoService.arrayBufferToBase64(salt.buffer as ArrayBuffer);
        payload.encryptedKey = encryptedKeyData;
        payload.keyIv = keyIv;
        keyParam = '';
      } else {
        const keyString = await CryptoService.exportKeyRaw(contentKey);
        keyParam = `&key=${keyString}`;
      }

      await StorageService.savePaste(payload);

      let origin = 'https://ghostbin.app';
      try {
        if (window.location.origin && window.location.origin !== 'null') {
          origin = window.location.origin;
        }
      } catch (e) { }

      let pathname = '/';
      try {
        pathname = window.location.pathname || '/';
      } catch (e) { }

      const url = `${origin}${pathname}#view/${id}${keyParam}`;
      setShareUrl(url);

    } catch (error) {
      console.error("Encryption failed:", error);
      setError("Failed to encrypt data. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setShareUrl(null);
    setContent('');
    setPassword('');
    setBurnAfterRead(false);
    setExpiration(24 * 60 * 60 * 1000);
    setLanguage('plaintext');
  };

  const getHighlightedCode = () => {
    if (typeof Prism === 'undefined' || language === 'plaintext') {
      // Manually escape html entities if not using Prism
      return content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
    const grammar = Prism.languages[language];
    if (!grammar) {
      return content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
    return Prism.highlight(content, grammar, language);
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  if (shareUrl) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 rounded-lg border border-white/5 bg-bg-surface shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-900/30">
            {password ? <KeyRound className="w-6 h-6 text-brand-500" /> : <Lock className="w-6 h-6 text-brand-500" />}
          </div>
          <h2 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">Secure Link Ready</h2>
          <p className="text-gray-500 text-sm">
            {password
              ? "Protected with master password."
              : "Encryption key included in URL."}
          </p>
        </div>

        <div className="bg-bg-dark border border-black/20 rounded p-4 mb-6 break-all font-mono text-xs text-gray-400 select-all">
          {shareUrl}
        </div>

        <div className="flex gap-3 justify-center">
          <Button
            onClick={copyToClipboard}
            icon={copied ? undefined : <Copy className="w-4 h-4" />}
            variant={copied ? "secondary" : "primary"}
          >
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button variant="secondary" onClick={handleReset} icon={<ExternalLink className="w-4 h-4" />}>
            New Paste
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] gap-4">
      {/* Editor Area */}
      <div className="relative group flex-grow flex flex-col bg-bg-surface rounded-lg border border-white/5 overflow-hidden transition-colors hover:border-white/10">

        {/* Syntax Highlighting Layer (Background) */}
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full m-0 overflow-hidden pointer-events-none select-none text-left"
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
              // Explicitly reset prism styles that might interfere
              padding: 0,
              margin: 0,
              border: 'none',
              background: 'transparent',
              boxShadow: 'none'
            }}
            dangerouslySetInnerHTML={{ __html: getHighlightedCode() + (content.endsWith('\n') ? '<br/>' : '') }}
          />
        </pre>

        {/* Transparent Editing Layer (Foreground) */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onScroll={handleScroll}
          placeholder="Type your secret message..."
          className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white resize-none focus:outline-none placeholder:text-gray-700 z-10 overflow-auto"
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
      </div>

      {/* Compact Control Bar */}
      <div className="relative flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-bg-surface p-2 rounded-lg border border-white/5">

        {error && (
          <div className="absolute bottom-full mb-2 left-0 right-0 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded text-sm text-center">
            {error}
          </div>
        )}

        {/* Password Input */}
        <div className="relative flex-grow group min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <KeyRound className={`h-4 w-4 transition-colors ${password ? 'text-brand-500' : 'text-gray-600 group-hover:text-gray-500'}`} />
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Optional Master Password"
            className="block w-full pl-10 pr-3 py-2 bg-bg-dark border border-transparent rounded text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:bg-bg-dark focus:ring-1 focus:ring-brand-900/50 transition-all font-mono"
          />
        </div>

        {/* Options Divider (Hidden on mobile) */}
        <div className="hidden md:block w-px h-8 bg-white/5 mx-1"></div>

        {/* Language Selector */}
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

        {/* Expiration Selector */}
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
          {/* Custom arrow for select */}
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <ChevronRight className="h-3 w-3 text-gray-600 rotate-90" />
          </div>
        </div>

        {/* Burn Toggle */}
        <label className="flex items-center justify-center gap-2 cursor-pointer px-3 py-2 rounded hover:bg-bg-dark transition-colors select-none border border-transparent hover:border-white/5 whitespace-nowrap">
          <input
            type="checkbox"
            checked={burnAfterRead}
            onChange={(e) => setBurnAfterRead(e.target.checked)}
            className="w-3 h-3 rounded-sm border-gray-600 bg-bg text-brand-600 focus:ring-brand-500/20 focus:ring-offset-0"
          />
          <span className={`text-xs font-mono uppercase tracking-wide ${burnAfterRead ? 'text-brand-500' : 'text-gray-500'}`}>
            Burn
          </span>
          {burnAfterRead && <Flame className="w-3 h-3 text-brand-500" />}
        </label>

        {/* Action Button */}
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