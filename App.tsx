import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from './components/Layout';
import { CreatePaste } from './components/CreatePaste';
import { ViewPaste } from './components/ViewPaste';
import { AboutPage } from './components/AboutPage';

const App: React.FC = () => {
  const [route, setRoute] = useState<'create' | 'view' | 'about'>('create');
  const [viewParams, setViewParams] = useState<{ id: string; key: string | null } | null>(null);
  const [createKey, setCreateKey] = useState(0);

  // Safe hash parsing that won't crash if location is restricted
  const parseHash = useCallback(() => {
    try {
      const hash = window.location.hash;
      if (hash.startsWith('#view/')) {
        const content = hash.replace('#view/', '');
        const [id, keyPart] = content.split('&key=');
        const key = keyPart ? decodeURIComponent(keyPart) : null;
        return { route: 'view' as const, params: { id, key } };
      }
    } catch (e) {
      // Fallback or ignore if location access is denied
    }
    return { route: 'create' as const, params: null };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const { route, params } = parseHash();
      setRoute(route);
      setViewParams(params);
    };

    window.addEventListener('hashchange', handleHashChange);

    // Initial sync
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [parseHash]);

  const handleNavigate = useCallback((dest: string) => {
    if (dest === 'create') {
      setRoute('create');
      setViewParams(null);
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
        if (window.location.hash !== '') {
          window.location.hash = '';
        }
      } catch (e) {
        console.warn('Navigation hash update blocked:', e);
      }
    }
  }, []);

  return (
    <Layout onNavigate={handleNavigate}>
      {route === 'create' && (
        <div className="max-w-4xl mx-auto">
          <CreatePaste key={createKey} />
        </div>
      )}

      {route === 'view' && viewParams && (
        <div className="max-w-5xl mx-auto">
          <ViewPaste
            pasteId={viewParams.id}
            decryptionKey={viewParams.key}
            onBack={() => handleNavigate('create')}
          />
        </div>
      )}

      {route === 'about' && (
        <AboutPage />
      )}
    </Layout>
  );
};

export default App;