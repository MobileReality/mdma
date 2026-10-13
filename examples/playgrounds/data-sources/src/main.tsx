import '@mobile-reality/mdma-renderer-react/styles.css';
import './app.css';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
