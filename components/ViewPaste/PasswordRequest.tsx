import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '../Button';

interface PasswordRequestProps {
  onSubmit: (password: string) => void;
  pasteId: string;
  errorMsg: string;
  onBack: () => void;
}

export const PasswordRequest: React.FC<PasswordRequestProps> = ({
  onSubmit,
  pasteId,
  errorMsg,
  onBack,
}) => {
  const [passwordInput, setPasswordInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(passwordInput);
  };

  return (
    <div className="max-w-sm mx-auto mt-20 p-8 rounded-lg border border-white/5 bg-bg-surface shadow-xl text-center">
      <div className="w-12 h-12 bg-bg-dark rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
        <KeyRound className="w-5 h-5 text-brand-500" />
      </div>
      <h2 className="text-lg font-bold text-white mb-1">Locked</h2>
      <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-6">
        ID: {pasteId.substring(0, 8)}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
};
