import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './AppIntegrated.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
