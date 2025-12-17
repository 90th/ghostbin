import { Component, createSignal, onMount, onCleanup, Switch, Match, For } from 'solid-js';
import { Layout } from './components/Layout';
import { CreatePaste } from './components/CreatePaste';
import { ViewPaste } from './components/ViewPaste';
import { AboutPage } from './components/AboutPage';

const App: Component = () => {
  const [route, setRoute] = createSignal<'create' | 'view' | 'about'>('create');
  const [viewParams, setViewParams] = createSignal<{ id: string; key: string | null } | null>(null);
  const [createKey, setCreateKey] = createSignal(0);
  const [forkData, setForkData] = createSignal<{ content: string; language: string } | null>(null);

  // Safe hash parsing that won't crash if location is restricted
  const parseHash = () => {
    try {
      const hash = window.location.hash;
      if (hash.startsWith('#view/')) {
        const content = hash.replace('#view/', '');
        const [id, keyPart] = content.split('&key=');
        const key = keyPart ? decodeURIComponent(keyPart) : null;
        return { route: 'view' as const, params: { id, key } };
      } else if (hash === '#about') {
        return { route: 'about' as const, params: null };
      }
    } catch (e) {
      // Fallback or ignore if location access is denied
    }
    return { route: 'create' as const, params: null };
  };

  const handleHashChange = () => {
    const { route: newRoute, params } = parseHash();
    setRoute(newRoute);
    setViewParams(params);
  };

  onMount(() => {
    window.addEventListener('hashchange', handleHashChange);
    // Initial sync
    handleHashChange();
  });

  onCleanup(() => {
    window.removeEventListener('hashchange', handleHashChange);
  });

  const handleNavigate = (dest: string) => {
    if (dest === 'create') {
      setRoute('create');
      setViewParams(null);
      setForkData(null);
      setCreateKey(prev => prev + 1);
      // Attempt to clear URL hash, but gracefully fail if blocked by sandbox
      try {
        if (window.location.hash !== '') {
          window.location.hash = '';
        }
      } catch (e) {
        console.warn('Navigation hash update blocked:', e);
      }
    } else if (dest === 'about') {
      setRoute('about');
      setViewParams(null);
      try {
        if (window.location.hash !== '#about') {
          window.location.hash = '#about';
        }
      } catch (e) {
        console.warn('Navigation hash update blocked:', e);
      }
    }
  };

  const handleFork = (content: string, language: string) => {
    setForkData({ content, language });
    setRoute('create');
    setViewParams(null);
    setCreateKey(prev => prev + 1);
    try {
      if (window.location.hash !== '') {
        window.location.hash = '';
      }
    } catch (e) {
      console.warn('Navigation hash update blocked:', e);
    }
  };

  return (
    <Layout onNavigate={handleNavigate}>
      <Switch>
        <Match when={route() === 'create'}>
          <div class="max-w-4xl mx-auto">
            {/* Force remount when createKey changes using For */}
            <For each={[createKey()]}>
              {() => <CreatePaste initialData={forkData()} />}
            </For>
          </div>
        </Match>

        <Match when={route() === 'view' && viewParams()}>
          <div class="max-w-5xl mx-auto">
            <ViewPaste
              pasteId={viewParams()!.id}
              decryptionKey={viewParams()!.key}
              onBack={() => handleNavigate('create')}
              onFork={handleFork}
            />
          </div>
        </Match>

        <Match when={route() === 'about'}>
          <AboutPage />
        </Match>
      </Switch>
    </Layout>
  );
};

export default App;