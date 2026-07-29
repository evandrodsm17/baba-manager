import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { AppProvider } from './context/AppContext';
import { RouterProvider } from './lib/router';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider>
      <AppProvider>
        <App />
        <PwaInstallPrompt />
      </AppProvider>
    </RouterProvider>
  </StrictMode>,
);
