import { Component, JSX } from 'solid-js';
import { Ghost, ShieldCheck, Github } from 'lucide-solid';

interface LayoutProps {
  children: JSX.Element;
  onNavigate: (route: string) => void;
}

export const Layout: Component<LayoutProps> = (props) => {
  return (
    <div class="min-h-screen bg-bg flex flex-col selection:bg-brand-900 selection:text-white">
      <header class="border-b border-white/5 bg-bg/90 backdrop-blur-md sticky top-0 z-50">
        <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => props.onNavigate('create')}
            class="flex items-center gap-3 group focus:outline-none"
          >
            <div class="w-8 h-8 bg-brand-600/10 rounded flex items-center justify-center border border-brand-600/20 group-hover:border-brand-600/50 transition-all">
              <Ghost class="w-5 h-5 text-brand-500 group-hover:text-brand-400" />
            </div>
            <div class="flex flex-col items-start">
              <span class="font-bold text-base tracking-tight text-gray-200">GHOSTBIN</span>
            </div>
          </button>

          <nav class="flex items-center gap-6">
            <a href="#" onClick={(e) => { e.preventDefault(); props.onNavigate('create') }} class="text-xs font-mono text-gray-500 hover:text-brand-500 transition-colors uppercase tracking-wider">New Paste</a>
            <a href="#" onClick={(e) => { e.preventDefault(); props.onNavigate('about') }} class="text-xs font-mono text-gray-500 hover:text-brand-500 transition-colors uppercase tracking-wider">About</a>
            <a href="https://github.com/90th/ghostbin" target="_blank" rel="noreferrer" class="text-gray-600 hover:text-gray-300">
              <Github class="w-4 h-4" />
            </a>
          </nav>
        </div>
      </header>

      <main class="flex-grow w-full max-w-5xl mx-auto px-4 py-6 relative">
        {props.children}
      </main>

      <footer class="border-t border-white/5 py-2 mt-auto bg-bg-dark/50">
        <div class="max-w-5xl mx-auto px-4 flex justify-between items-center text-[11px] font-bold text-gray-500 font-mono">
          <div class="flex items-center gap-1.5">
            <ShieldCheck class="w-3 h-3 text-brand-600" />
            <span>AES-256-GCM Encrypted</span>
          </div>
          <p class="opacity-70">© {new Date().getFullYear()} Ghostbin</p>
        </div>
      </footer>
    </div>
  );
};