import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for seamless offline caching & instant startup on phone
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('Dvojeziko update available');
    },
    onOfflineReady() {
      console.log('Dvojeziko is cached and ready for offline use');
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
