import React from 'react';
import { KeyRound, Eye, EyeOff, Dices, Code, ChevronRight, Clock, Flame } from 'lucide-react';
import { Button } from '../Button';
import { cn } from '../../lib/utils';
import { LANGUAGE_OPTIONS, EXPIRATION_OPTIONS } from '../../lib/constants';

interface PasteOptionsBarProps {
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  handleGeneratePassword: () => void;
  language: string;
  setLanguage: (language: string) => void;
  expiration: number;
  setExpiration: (expiration: number) => void;
  burnAfterRead: boolean;
  setBurnAfterRead: (burn: boolean) => void;
  handleEncrypt: () => void;
  isProcessing: boolean;
  error: string | null;
  content: string;
}

export const PasteOptionsBar: React.FC<PasteOptionsBarProps> = ({
  password,
  setPassword,
  showPassword,
  setShowPassword,
  handleGeneratePassword,
  language,
  setLanguage,
  expiration,
  setExpiration,
  burnAfterRead,
  setBurnAfterRead,
  handleEncrypt,
  isProcessing,
  error,
  content,
}) => {
  return (
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
  );
};
