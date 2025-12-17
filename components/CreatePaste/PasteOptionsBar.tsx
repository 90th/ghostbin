import { Component, For, Show } from 'solid-js';
import { KeyRound, Eye, EyeOff, Dices, Code, ChevronRight, Clock, Flame } from 'lucide-solid';
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

export const PasteOptionsBar: Component<PasteOptionsBarProps> = (props) => {
  return (
    <div class="relative flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-bg-surface p-2 rounded-lg border border-white/5">

      <Show when={props.error}>
        <div class="absolute bottom-full mb-2 left-0 right-0 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded text-sm text-center">
          {props.error}
        </div>
      </Show>

      <div class="relative flex-grow group min-w-[200px]">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <KeyRound class={cn("h-4 w-4 transition-colors", props.password ? 'text-brand-500' : 'text-gray-600 group-hover:text-gray-500')} />
        </div>
        <input
          type={props.showPassword ? 'text' : 'password'}
          value={props.password}
          onInput={(e) => props.setPassword(e.currentTarget.value)}
          placeholder="Optional Master Password"
          class="block w-full pl-10 pr-20 py-2 bg-bg-dark border border-transparent rounded text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:bg-bg-dark focus:ring-1 focus:ring-brand-900/50 transition-all font-mono"
        />
        <div class="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
          <button
            type="button"
            onClick={() => props.setShowPassword(!props.showPassword)}
            class="p-1.5 text-gray-600 hover:text-brand-500 transition-colors rounded hover:bg-white/5"
            title={props.showPassword ? "Hide Password" : "Show Password"}
          >
            <Show when={props.showPassword} fallback={<Eye class="h-4 w-4" />}>
              <EyeOff class="h-4 w-4" />
            </Show>
          </button>
          <button
            type="button"
            onClick={props.handleGeneratePassword}
            class="p-1.5 text-gray-600 hover:text-brand-500 transition-colors rounded hover:bg-white/5"
            title="Generate Secure Password"
          >
            <Dices class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div class="hidden md:block w-px h-8 bg-white/5 mx-1"></div>

      <div class="relative min-w-[140px]">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Code class="h-4 w-4 text-gray-600" />
        </div>
        <select
          value={props.language}
          onChange={(e) => props.setLanguage(e.currentTarget.value)}
          class="block w-full pl-10 pr-3 py-2 bg-bg-dark border border-transparent rounded text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-900/50 font-mono appearance-none cursor-pointer hover:bg-[#222]"
        >
          <For each={LANGUAGE_OPTIONS}>
            {(option) => (
              <option value={option.value}>
                {option.label}
              </option>
            )}
          </For>
        </select>
        <div class="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
          <ChevronRight class="h-3 w-3 text-gray-600 rotate-90" />
        </div>
      </div>

      <div class="relative min-w-[140px]">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Clock class="h-4 w-4 text-gray-600" />
        </div>
        <select
          value={props.expiration}
          onChange={(e) => props.setExpiration(Number(e.currentTarget.value))}
          class="block w-full pl-10 pr-3 py-2 bg-bg-dark border border-transparent rounded text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-900/50 font-mono appearance-none cursor-pointer hover:bg-[#222]"
        >
          <For each={EXPIRATION_OPTIONS}>
            {(option) => (
              <option value={option.value}>
                {option.label}
              </option>
            )}
          </For>
        </select>
        <div class="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
          <ChevronRight class="h-3 w-3 text-gray-600 rotate-90" />
        </div>
      </div>

      <label class="flex items-center justify-center gap-2 cursor-pointer px-3 py-2 rounded hover:bg-bg-dark transition-colors select-none border border-transparent hover:border-white/5 whitespace-nowrap">
        <input
          type="checkbox"
          checked={props.burnAfterRead}
          onChange={(e) => props.setBurnAfterRead(e.currentTarget.checked)}
          class="w-3 h-3 rounded-sm border-gray-600 bg-bg text-brand-600 focus:ring-brand-500/20 focus:ring-offset-0"
        />
        <span class={cn("text-xs font-mono uppercase tracking-wide", props.burnAfterRead ? 'text-brand-500' : 'text-gray-500')}>
          Burn
        </span>
        <Show when={props.burnAfterRead}>
          <Flame class="w-3 h-3 text-brand-500" />
        </Show>
      </label>

      <Button
        onClick={props.handleEncrypt}
        disabled={!props.content.trim()}
        isLoading={props.isProcessing}
        class="md:w-auto w-full min-w-[120px]"
      >
        Encrypt
      </Button>
    </div>
  );
};
