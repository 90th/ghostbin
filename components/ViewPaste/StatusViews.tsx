import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../Button';

export const LoadingView: React.FC<{ status: 'loading' | 'decrypting' }> = ({ status }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
    <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
    <div className="font-mono text-xs text-gray-500 uppercase tracking-widest">
      {status === 'loading' ? 'Securing Connection...' : 'Decrypting...'}
    </div>
  </div>
);

interface ErrorViewProps {
  errorMsg: string;
  onBack: () => void;
}

export const ErrorView: React.FC<ErrorViewProps> = ({ errorMsg, onBack }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
    <div className="w-16 h-16 bg-red-900/10 rounded-full flex items-center justify-center mb-6 border border-red-900/20">
      <AlertTriangle className="w-8 h-8 text-brand-600" />
    </div>
    <h2 className="text-xl font-bold text-gray-200 mb-2">Access Denied</h2>
    <p className="text-gray-500 text-sm max-w-xs mx-auto mb-8">{errorMsg}</p>
    <Button onClick={onBack} variant="secondary">Return Home</Button>
  </div>
);
