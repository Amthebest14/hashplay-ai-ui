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

export const appKit = createAppKit({
    adapters: [new EthersAdapter()],
    networks: [hederaTestnet],
    metadata,
    projectId,
    features: {
        analytics: true
    },
    customWallets: [
        {
            id: '1ddc8119eb4ee7d65698b3d881510e1f38aca167905d4f10738e4df5e2fbdd21',
            name: 'HashPack',
            homepage: 'https://www.hashpack.app/',
            image_url: 'https://explorer-api.walletconnect.com/w3m/v1/getWalletImage/f2f531aa-0863-4def-9d10-3882ff2f5a00?projectId=e75582c66a8226305655dcbc1b75d53f',
            desktop_link: 'https://www.hashpack.app/',
            webapp_link: 'https://wallet.hashpack.app',
            mobile_link: 'hashpack://',
        },
        {
            id: '7d3ab79e320f6c2cfffcb70fbdff7db75aefaebbc3012a64c5147bebf633d711',
            name: 'Blade Wallet',
            homepage: 'https://bladewallet.io/',
            image_url: 'https://explorer-api.walletconnect.com/v3/logo/md/86e969d7-df03-4f93-0ec3-e29f86419000?projectId=2f05ae7f1116030fde2d36508f472bfb',
            desktop_link: 'https://bladewallet.io/',
            mobile_link: 'blade://',
        },
        {
            id: 'fa8bc6a992e5959c5d1796c568acdef60b1e4284fcde26715f231e3ccb865bd2',
            name: 'Kabila Wallet',
            homepage: 'https://kabila.app/',
            image_url: 'https://explorer-api.walletconnect.com/v3/logo/md/19ed5b07-683a-4de1-11d4-b7bebedec000?projectId=2f05ae7f1116030fde2d36508f472bfb',
            desktop_link: 'https://kabila.app/',
            mobile_link: 'kabila://',
        }
    ],
    // Pin important Hedera Native Wallets to the front page
    featuredWalletIds: [
        '1ddc8119eb4ee7d65698b3d881510e1f38aca167905d4f10738e4df5e2fbdd21', // HashPack
    ],
    // Force them to show up on the modal alongside the default injected ones
    allWallets: 'SHOW'
})

export function WalletConnectProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
