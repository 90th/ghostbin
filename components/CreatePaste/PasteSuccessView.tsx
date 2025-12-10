import React, { useState } from 'react';
import { Check, Copy, KeyRound, Eye, EyeOff, Clock, Flame, ExternalLink, Link } from 'lucide-react';
import { Button } from '../Button';
import { cn } from '../../lib/utils';
import { EXPIRATION_OPTIONS } from '../../lib/constants';

interface PasteSuccessViewProps {
  shareUrl: string;
  password?: string;
  expiration: number;
  burnAfterRead: boolean;
  onReset: () => void;
}

export const PasteSuccessView: React.FC<PasteSuccessViewProps> = ({
  shareUrl,
  password,
  expiration,
  burnAfterRead,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [receiptPasswordVisible, setReceiptPasswordVisible] = useState(false);

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
        <Button variant="secondary" onClick={onReset} icon={<ExternalLink className="w-4 h-4" />} className="w-full justify-center">
          Create New Paste
        </Button>
      </div>
    </div>
  );
};
