import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import NotesPage from './pages/NotesPage';
import EditorPage from './pages/EditorPage';
import GraphPage from './pages/GraphPage';
import FlashcardsPage from './pages/FlashcardsPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import VaultHealthPage from './pages/VaultHealthPage';
import IngestPage from './pages/IngestPage';
import JarvisHUD from './components/JarvisHUD';
import DesktopNeonOrb from './components/DesktopNeonOrb';
import ErrorBoundary from './components/ErrorBoundary';

type Page = 'notes' | 'editor' | 'graph' | 'flashcards' | 'search' | 'settings' | 'vault-health' | 'ingest';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('notes');
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);

  const isOrbOnlyMode = typeof window !== 'undefined' && window.location.search.includes('mode=orb');

  useEffect(() => {
    if (isOrbOnlyMode) {
      document.documentElement.classList.add('mode-orb');
      document.body.classList.add('mode-orb');
    }
  }, [isOrbOnlyMode]);

  // Close HUD on Esc key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isJarvisOpen) {
        setIsJarvisOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isJarvisOpen]);

  // Global Quick Note Shortcut handler
  useEffect(() => {
    if (window.electronAPI?.onQuickNote) {
      const cleanup = window.electronAPI.onQuickNote(() => {
        setCurrentPage('editor');
      });
      return cleanup;
    }
  }, []);

  if (isOrbOnlyMode) {
    return (
      <div className="w-full h-full bg-transparent overflow-hidden flex items-center justify-center">
        <DesktopNeonOrb
          standaloneMode={true}
          onOpenJarvis={() => {
            window.electronAPI?.focusMainWindow();
          }}
        />
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'notes': return <NotesPage onNavigate={setCurrentPage as any} />;
      case 'editor': return <EditorPage />;
      case 'graph': return <GraphPage />;
      case 'flashcards': return <FlashcardsPage onNavigate={setCurrentPage as any} />;
      case 'search': return <SearchPage onNavigate={setCurrentPage as any} />;
      case 'settings': return <SettingsPage />;
      case 'vault-health': return <VaultHealthPage />;
      case 'ingest': return <IngestPage />;
      default: return <NotesPage onNavigate={setCurrentPage as any} />;
    }
  };

  return (
    <ErrorBoundary onReset={() => setCurrentPage('notes')}>
      <Layout
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onOpenJarvis={() => setIsJarvisOpen(true)}
      >
        <ErrorBoundary onReset={() => setCurrentPage('notes')}>
          {renderPage()}
        </ErrorBoundary>
      </Layout>

      {/* Futuristic JARVIS HUD Overlay */}
      <JarvisHUD
        isOpen={isJarvisOpen}
        onClose={() => setIsJarvisOpen(false)}
      />
    </ErrorBoundary>
  );
}
