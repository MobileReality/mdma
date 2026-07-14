import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// MDMA renderer's default component styling (forms, tables, gates, …).
import '@mobile-reality/mdma-renderer-react/styles.css';
import { App } from './App.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
