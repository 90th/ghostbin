import { Component, createSignal, Show } from 'solid-js';
import { KeyRound } from 'lucide-solid';
import { Button } from '../Button';

interface PasswordRequestProps {
  onSubmit: (password: string) => void;
  pasteId: string;
  errorMsg: string;
  onBack: () => void;
}

export const PasswordRequest: Component<PasswordRequestProps> = (props) => {
  const [passwordInput, setPasswordInput] = createSignal('');

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    props.onSubmit(passwordInput());
  };

  return (
    <div class="max-w-sm mx-auto mt-20 p-8 rounded-lg border border-white/5 bg-bg-surface shadow-xl text-center">
      <div class="w-12 h-12 bg-bg-dark rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
        <KeyRound class="w-5 h-5 text-brand-500" />
      </div>
      <h2 class="text-lg font-bold text-white mb-1">Locked</h2>
      <div class="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-6">
        ID: {props.pasteId.substring(0, 8)}
      </div>

      <form onSubmit={handleSubmit} class="space-y-4">
        <input
          type="password"
          value={passwordInput()}
          onInput={(e) => setPasswordInput(e.currentTarget.value)}
          placeholder="Enter Password..."
          class="w-full bg-bg-dark border border-transparent rounded px-4 py-2 text-white placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-900 font-mono text-sm text-center transition-all"
          autofocus
        />
        <Show when={props.errorMsg}>
          <p class="text-brand-500 text-xs">{props.errorMsg}</p>
        </Show>

        <Button type="submit" class="w-full">Unlock Payload</Button>
      </form>

      <button onClick={props.onBack} class="mt-6 text-gray-600 text-[10px] hover:text-gray-400 uppercase tracking-widest transition-colors">
        Abort
      </button>
    </div>
  );
};
