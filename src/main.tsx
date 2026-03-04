import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer';

// Polyfill Buffer for HashPack WalletConnect communication
window.Buffer = Buffer;
window.global = window;

import './index.css'
import App from './App.tsx'
import { WalletConnectProvider } from './context/WalletConnectContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletConnectProvider>
      <App />
    </WalletConnectProvider>
  </StrictMode>,
)
