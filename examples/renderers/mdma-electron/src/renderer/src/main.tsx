import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@mobile-reality/mdma-renderer-react/styles.css';
import './styles.css';
import { App } from './App.js';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
