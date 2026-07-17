import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import { sepolia, mainnet } from 'viem/chains'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || "clpispdty00ycl80fpueukbhl"}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#00F2FE',
        },
        defaultChain: sepolia,
        supportedChains: [sepolia, mainnet],
        loginMethods: ['wallet']
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
)
