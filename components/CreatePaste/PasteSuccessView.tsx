import { Component, createSignal, Show } from 'solid-js';
import { Check, Copy, KeyRound, Eye, EyeOff, Clock, Flame, ExternalLink, Link } from 'lucide-solid';
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

export const PasteSuccessView: Component<PasteSuccessViewProps> = (props) => {
  const [copied, setCopied] = createSignal(false);
  const [passwordCopied, setPasswordCopied] = createSignal(false);
  const [receiptPasswordVisible, setReceiptPasswordVisible] = createSignal(false);

  const copyToClipboard = () => {
    if (props.shareUrl) {
      navigator.clipboard.writeText(props.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyPasswordToClipboard = () => {
    if (props.password) {
      navigator.clipboard.writeText(props.password);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    }
  };

  const expirationLabel = () => EXPIRATION_OPTIONS.find(o => o.value === props.expiration)?.label || 'Custom';

  return (
    <div class="max-w-lg mx-auto mt-12 p-0 rounded-xl border border-white/10 bg-bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div class="bg-brand-900/10 border-b border-white/5 p-6 text-center">
        <div class="w-12 h-12 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-brand-500/30">
          <Check class="w-6 h-6 text-brand-400" />
        </div>
        <h2 class="text-xl font-bold text-white tracking-tight">Encryption Successful</h2>
      </div>

      <div class="p-6 space-y-6">
        <div class="space-y-2">
          <label class="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Link class="w-3 h-3" /> Shareable Link (Onion)
          </label>
          <div class="relative group">
            <div class="w-full bg-bg-dark border border-black/20 rounded-md py-3 pl-3 pr-12 font-mono text-sm text-gray-300 truncate select-all">
              {props.shareUrl}
            </div>
            <button
              onClick={copyToClipboard}
              class="absolute right-1 top-1 bottom-1 px-3 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
              title="Copy Link"
            >
              <Show when={copied()} fallback={<Copy class="w-4 h-4" />}>
                <Check class="w-4 h-4 text-green-400" />
              </Show>
            </button>
          </div>
        </div>

        <Show when={props.password}>
          <div class="space-y-2">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <KeyRound class="w-3 h-3" /> Decryption Password
            </label>
            <div class="relative group">
              <input
                type={receiptPasswordVisible() ? "text" : "password"}
                value={props.password}
                readOnly
                class="w-full bg-bg-dark border border-brand-900/20 rounded-md py-3 pl-3 pr-20 font-mono text-sm text-brand-200 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
              />
              <div class="absolute right-1 top-1 bottom-1 flex gap-1">
                <button
                  onClick={() => setReceiptPasswordVisible(!receiptPasswordVisible())}
                  class="w-8 flex items-center justify-center rounded hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
                  title={receiptPasswordVisible() ? "Hide Password" : "Show Password"}
                >
                  <Show when={receiptPasswordVisible()} fallback={<Eye class="w-4 h-4" />}>
                    <EyeOff class="w-4 h-4" />
                  </Show>
                </button>
                <button
                  onClick={copyPasswordToClipboard}
                  class="w-8 flex items-center justify-center rounded hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
                  title="Copy Password"
                >
                  <Show when={passwordCopied()} fallback={<Copy class="w-4 h-4" />}>
                    <Check class="w-4 h-4 text-green-400" />
                  </Show>
                </button>
              </div>
            </div>
            <p class="text-[11px] text-red-400/80 font-mono mt-1">
              Save this now. It cannot be recovered.
            </p>
          </div>
        </Show>
      </div>

      <div class="bg-bg-dark/50 border-t border-white/5 p-4 flex items-center justify-between text-xs font-mono text-gray-500">
        <div class="flex items-center gap-2">
          <Clock class="w-3 h-3" />
          <span>Expires: {expirationLabel()}</span>
        </div>
        <div class="flex items-center gap-2">
          <Flame class={cn("w-3 h-3", props.burnAfterRead ? 'text-brand-500' : 'text-gray-600')} />
          <span>Burn: {props.burnAfterRead ? 'Yes' : 'No'}</span>
        </div>
      </div>

      <div class="p-4 border-t border-white/5 bg-bg-surface">
        <Button variant="secondary" onClick={props.onReset} icon={<ExternalLink class="w-4 h-4" />} class="w-full justify-center">
          Create New Paste
        </Button>
      </div>
    </div>
  );
};
