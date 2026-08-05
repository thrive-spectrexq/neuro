import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import NotesPage from './pages/NotesPage';
import EditorPage from './pages/EditorPage';
import GraphPage from './pages/GraphPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import JarvisHUD from './components/JarvisHUD';

type Page = 'notes' | 'editor' | 'graph' | 'search' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('notes');
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);

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

  const renderPage = () => {
    switch (currentPage) {
      case 'notes': return <NotesPage onNavigate={setCurrentPage as any} />;
      case 'editor': return <EditorPage />;
      case 'graph': return <GraphPage />;
      case 'search': return <SearchPage onNavigate={setCurrentPage as any} />;
      case 'settings': return <SettingsPage />;
      default: return <NotesPage onNavigate={setCurrentPage as any} />;
    }
  };

  return (
    <>
      <Layout
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onOpenJarvis={() => setIsJarvisOpen(true)}
      >
        {renderPage()}
      </Layout>

      {/* Futuristic JARVIS HUD Overlay */}
      <JarvisHUD
        isOpen={isJarvisOpen}
        onClose={() => setIsJarvisOpen(false)}
      />
    </>
  );
}
