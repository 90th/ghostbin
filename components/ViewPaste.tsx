import React, { useEffect, useState, useRef } from 'react';
import { Unlock, AlertTriangle, Check, KeyRound, Eye, Calendar, Clock, Code, Lock, FileText } from 'lucide-react';
import { Button } from './Button';
import * as CryptoService from '../services/cryptoService';
import * as StorageService from '../services/storageService';
import { DecryptedPaste, EncryptedPaste } from '../types';
import { isValidLanguage } from '../lib/constants';
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

interface ViewPasteProps {
  pasteId: string;
  decryptionKey: string | null;
  onBack: () => void;
}

export const ViewPaste: React.FC<ViewPasteProps> = ({ pasteId, decryptionKey, onBack }) => {
  const [status, setStatus] = useState<'loading' | 'error' | 'password_required' | 'decrypting' | 'success'>('loading');
  const [pasteData, setPasteData] = useState<EncryptedPaste | null>(null);
  const [decryptedPaste, setDecryptedPaste] = useState<DecryptedPaste | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [rawCopied, setRawCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const fetchPaste = async () => {
      try {
        // fetch metadata first to check if password is required without downloading full payload
        const metadata = await StorageService.getPasteMetadata(pasteId);
        if (!metadata || !metadata.exists) {
          throw new Error("Paste not found, expired, or burned.");
        }

        // if password required, prompt user before fetching full encrypted content
        if (metadata.hasPassword) {
          setStatus('password_required');
          return;
        }

        // no password needed, fetch full paste and decrypt
        if (!decryptionKey) {
          throw new Error("Decryption key missing.");
        }

        const encryptedData = await StorageService.getPaste(pasteId);
        if (!encryptedData) {
          throw new Error("Paste not found, expired, or burned.");
        }

        setPasteData(encryptedData);
        decryptContent(encryptedData, decryptionKey);

      } catch (err: any) {
        console.error(err);
        setStatus('error');
        setErrorMsg(err.message || "Failed to load paste.");
      }
    };

    fetchPaste();
  }, [pasteId, decryptionKey]);

  // Trigger Syntax Highlight when content is ready
  useEffect(() => {
    if (decryptedPaste && codeRef.current && typeof Prism !== 'undefined') {
      Prism.highlightElement(codeRef.current);
    }
  }, [decryptedPaste]);

  const decryptContent = async (data: EncryptedPaste, keyString: string, isPasswordDerived = false) => {
    setStatus('decrypting');
    try {
      let contentKey: CryptoKey;

      if (isPasswordDerived) {
        if (!data.salt || !data.encryptedKey || !data.keyIv) {
          throw new Error("Corrupt password data.");
        }
        const salt = new Uint8Array(CryptoService.base64ToArrayBuffer(data.salt));
        const wrapperKey = await CryptoService.deriveKeyFromPassword(keyString, salt);
        const decryptedKeyJson = await CryptoService.decryptText(data.encryptedKey, data.keyIv, wrapperKey);
        contentKey = await CryptoService.importKey(decryptedKeyJson);
      } else {
        contentKey = await CryptoService.importKeyRaw(keyString);
      }

      const rawDecrypted = await CryptoService.decryptText(data.data, data.iv, contentKey);

      // parse payload to extract text, language, and burn token
      let text = rawDecrypted;
      let burnToken: string | undefined;
      let language: string = 'plaintext';

      try {
        const payload = JSON.parse(rawDecrypted);
        if (payload && typeof payload === 'object' && 'text' in payload) {
          text = payload.text;
          burnToken = payload.burnToken;
          // validate language against allowlist to prevent dom injection via class name
          if (payload.language && isValidLanguage(payload.language)) {
            language = payload.language;
          }
        }
      } catch (e) {
        // legacy paste or plain text, keep defaults
      }

      setDecryptedPaste({
        id: data.id,
        text,
        createdAt: data.createdAt,
        burnAfterRead: data.burnAfterRead,
        views: data.views,
        expiresAt: data.expiresAt,
        language,
        burnToken
      });
      setStatus('success');

      // If Burn After Read, delete now that we have successfully decrypted
      // We pass the burnToken to prove we decrypted it
      if (data.burnAfterRead) {
        StorageService.deletePaste(data.id, burnToken).catch(console.error);
      }

    } catch (err: any) {
      if (isPasswordDerived) {
        setStatus('password_required');
        setErrorMsg("Incorrect password.");
      } else {
        setStatus('error');
        setErrorMsg("Decryption failed. Key invalid.");
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      // fetch full paste only after password is provided
      const encryptedData = await StorageService.getPaste(pasteId);
      if (!encryptedData) {
        throw new Error("Paste not found, expired, or burned.");
      }

      setPasteData(encryptedData);
      decryptContent(encryptedData, passwordInput, true);
    } catch (err: any) {
      setStatus('password_required');
      setErrorMsg(err.message || "Failed to load paste.");
    }
  };

  const handleCopyRaw = () => {
    if (decryptedPaste) {
      navigator.clipboard.writeText(decryptedPaste.text);
      setRawCopied(true);
      setTimeout(() => setRawCopied(false), 2000);
    }
  };
  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(ts));
  };

  if (status === 'loading' || status === 'decrypting') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="font-mono text-xs text-gray-500 uppercase tracking-widest">
          {status === 'loading' ? 'Securing Connection...' : 'Decrypting...'}
        </div>
      </div>
    );
  }

  if (status === 'password_required') {
    return (
      <div className="max-w-sm mx-auto mt-20 p-8 rounded-lg border border-white/5 bg-bg-surface shadow-xl text-center">
        <div className="w-12 h-12 bg-bg-dark rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
          <KeyRound className="w-5 h-5 text-brand-500" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Locked</h2>
        <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-6">
          ID: {pasteId.substring(0, 8)}
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Enter Password..."
            className="w-full bg-bg-dark border border-transparent rounded px-4 py-2 text-white placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-900 font-mono text-sm text-center transition-all"
            autoFocus
          />
          {errorMsg && <p className="text-brand-500 text-xs">{errorMsg}</p>}

          <Button type="submit" className="w-full">Unlock Payload</Button>
        </form>

        <button onClick={onBack} className="mt-6 text-gray-600 text-[10px] hover:text-gray-400 uppercase tracking-widest transition-colors">
          Abort
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
        <div className="w-16 h-16 bg-red-900/10 rounded-full flex items-center justify-center mb-6 border border-red-900/20">
          <AlertTriangle className="w-8 h-8 text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-200 mb-2">Access Denied</h2>
        <p className="text-gray-500 text-sm max-w-xs mx-auto mb-8">{errorMsg}</p>
        <Button onClick={onBack} variant="secondary">Return Home</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-white/5 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-900/10 rounded border border-brand-900/20">
              <Unlock className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-0.5">Paste ID</div>
              <div className="text-base font-mono text-white font-bold tracking-wide">{decryptedPaste?.id.substring(0, 8)}</div>
            </div>
          </div>

          <div className="flex items-center">
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
              <div className="text-xs text-gray-400">{decryptedPaste && formatDate(decryptedPaste.createdAt)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-gray-600" />
            <div>
              <div className="text-[10px] font-mono text-gray-600 uppercase">Expires</div>
              <div className="text-xs text-gray-400">
                {decryptedPaste?.expiresAt ? formatDate(decryptedPaste.expiresAt) : 'Never'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Code className="w-3 h-3 text-gray-600" />
            <div>
              <div className="text-[10px] font-mono text-gray-600 uppercase">Language</div>
              <div className="text-xs text-gray-400 capitalize">
                {decryptedPaste?.language || 'Plain Text'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-3 h-3 text-gray-600" />
            <div>
              <div className="text-[10px] font-mono text-gray-600 uppercase">Views</div>
              <div className="text-xs text-gray-400">{decryptedPaste?.views}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative group">
        <pre className="w-full min-h-[50vh] max-h-[70vh] overflow-auto bg-bg-surface p-6 rounded-lg border border-white/5 selection:bg-brand-900 selection:text-white scrollbar-thin">
          <code ref={codeRef} className={`language-${decryptedPaste?.language || 'plaintext'}`}>
            {decryptedPaste?.text}
          </code>
        </pre>
        {decryptedPaste?.burnAfterRead && (
          <div className="absolute top-4 right-4 bg-brand-900/20 border border-brand-900/30 text-brand-500 px-2 py-1 rounded text-[10px] font-mono flex items-center gap-2 uppercase tracking-wider backdrop-blur-sm">
            <AlertTriangle className="w-3 h-3" />
            Burned
          </div>
        )}
      </div>
    </div>
  );
};