import { createAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { hederaTestnet, sepolia } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http } from 'viem'
import React, { useEffect } from 'react';

// Setup queryClient
const queryClient = new QueryClient()

// Get Project ID from .env
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
    console.error("Missing VITE_WALLETCONNECT_PROJECT_ID in environment variables");
}

// Create a metadata object
const metadata = {
    name: 'Hashplay AI',
    description: 'AI-Powered On-Chain Gaming Arena on Hedera',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://hashplay-ai.vercel.app/',
    icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// Setup Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
    projectId,
    networks: [hederaTestnet, sepolia],
    transports: {
        [hederaTestnet.id]: http(),
        [sepolia.id]: http()
    }
});

// Initialize AppKit instance
export const appKitInstance = createAppKit({
    adapters: [wagmiAdapter],
    networks: [hederaTestnet, sepolia],
    defaultNetwork: hederaTestnet,
    metadata,
    projectId,
    features: {
        analytics: true,
        email: false,
        socials: false,
        onramp: false,
        swaps: false,
    },
    allWallets: 'SHOW',
    featuredWalletIds: ['fe118834751cf61cd30c74c0ca183965'], // Force HashPack to the top
    allowUnsupportedChain: true,
    enableWalletConnect: true,
    enableInjected: true, // Crucial for EIP-6963 discovery (HashPack/MetaMask)
});

// EIP-6963 Runtime Diagnostics
if (typeof window !== 'undefined') {
    window.addEventListener('eip6963:announceProvider', (event: any) => {
        console.log('🚀 Hedera Wallet Detected via EIP-6963:', event.detail.info.name);
    });
}

export function WalletConnectProvider({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <NetworkGuard />
            {children}
        </QueryClientProvider>
    );
}

/**
 * Pre-flight check: Ensures Metamask is on Hedera Testnet BEFORE opening the modal.
 */
export async function ensureHederaNetwork() {
    if ((window as any).ethereum) {
        try {
            await (window as any).ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x128' }], // 296 in hex
            });
            return true;
        } catch (switchError: any) {
            if (switchError.code === 4902) {
                try {
                    await (window as any).ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: '0x128',
                                chainName: 'Hedera Testnet',
                                nativeCurrency: {
                                    name: 'HBAR',
                                    symbol: 'HBAR',
                                    decimals: 18,
                                },
                                rpcUrls: ['https://testnet.hashio.io/api'],
                                blockExplorerUrls: ['https://hashscan.io/testnet'],
                            },
                        ],
                    });
                    return true;
                } catch (addError) {
                    console.error("User rejected adding Hedera network");
                    return false;
                }
            }
            return false;
        }
    }
    return true;
}

function NetworkGuard() {
    const { isConnected } = useAppKitAccount();
    const { caipNetwork } = useAppKitNetwork();

    useEffect(() => {
        const checkNetwork = async () => {
            if (isConnected && (window as any).ethereum && caipNetwork?.id !== 296) {
                await ensureHederaNetwork();
            }
        };

        const timer = setTimeout(checkNetwork, 1000);
        return () => clearTimeout(timer);
    }, [isConnected, caipNetwork?.id]);

    return null;
}
