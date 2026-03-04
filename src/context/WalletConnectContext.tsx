import { createAppKit } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { defineChain } from '@reown/appkit/networks'
import React from 'react';

// Get Project ID from .env
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
    console.error("Missing VITE_WALLETCONNECT_PROJECT_ID in environment variables");
}

// Set up Hedera Testnet (Chain ID: 296)
const hederaTestnet = defineChain({
    id: 296,
    caipNetworkId: 'eip155:296',
    chainNamespace: 'eip155',
    name: 'Hedera Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'HBAR',
        symbol: 'HBAR',
    },
    rpcUrls: {
        default: {
            http: ['https://testnet.hashio.io/api'],
        },
    },
    blockExplorers: {
        default: { name: 'Hashscan', url: 'https://hashscan.io/testnet' },
    },
})

// Create a metadata object
const metadata = {
    name: 'Hashplay AI',
    description: 'AI-Powered On-Chain Gaming Arena on Hedera',
    url: 'https://hashplay-ai.vercel.app',
    icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// Create the AppKit instance with EthersAdapter
export const appKit = createAppKit({
    adapters: [new EthersAdapter()],
    networks: [hederaTestnet],
    metadata,
    projectId,
    features: {
        analytics: true
    }
})

export function WalletConnectProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
