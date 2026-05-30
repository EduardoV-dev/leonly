import { AppToaster } from '@/components/ui/toaster';
import '@/lib/i18n';
import { QueryProvider } from '@/providers/QueryProvider';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@/styles/globals.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryProvider>
      <App />
      <AppToaster />
    </QueryProvider>
  </React.StrictMode>,
);
