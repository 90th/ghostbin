import { Component } from 'solid-js';
import { AlertTriangle } from 'lucide-solid';
import { Button } from '../Button';

export const LoadingView: Component<{ status: 'loading' | 'decrypting' }> = (props) => (
  <div class="flex flex-col items-center justify-center h-[60vh] space-y-4">
    <div class="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
    <div class="font-mono text-xs text-gray-500 uppercase tracking-widest">
      {props.status === 'loading' ? 'Securing Connection...' : 'Decrypting...'}
    </div>
  </div>
);

interface ErrorViewProps {
  errorMsg: string;
  onBack: () => void;
}

export const ErrorView: Component<ErrorViewProps> = (props) => (
  <div class="flex flex-col items-center justify-center h-[60vh] text-center p-8">
    <div class="w-16 h-16 bg-red-900/10 rounded-full flex items-center justify-center mb-6 border border-red-900/20">
      <AlertTriangle class="w-8 h-8 text-brand-600" />
    </div>
    <h2 class="text-xl font-bold text-gray-200 mb-2">Access Denied</h2>
    <p class="text-gray-500 text-sm max-w-xs mx-auto mb-8">{props.errorMsg}</p>
    <Button onClick={props.onBack} variant="secondary">Return Home</Button>
  </div>
);
