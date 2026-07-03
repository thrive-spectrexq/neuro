import React, { useState } from 'react';
import Layout from './components/Layout';
import NotesPage from './pages/NotesPage';
import EditorPage from './pages/EditorPage';
import GraphPage from './pages/GraphPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';

type Page = 'notes' | 'editor' | 'graph' | 'search' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('notes');

  const renderPage = () => {
    switch (currentPage) {
      case 'notes': return <NotesPage onNavigate={setCurrentPage as any} />;
      case 'editor': return <EditorPage />;
      case 'graph': return <GraphPage />;
      case 'search': return <SearchPage />;
      case 'settings': return <SettingsPage />;
      default: return <NotesPage onNavigate={setCurrentPage as any} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}
