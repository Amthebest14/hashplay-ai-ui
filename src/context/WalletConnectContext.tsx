import { createAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'
import {
    HederaAdapter,
    HederaChainDefinition,
    HederaProvider,
    hederaNamespace
} from '@hashgraph/hedera-wallet-connect'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useEffect, useState } from 'react';

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

// 1. Setup EVM Adapter (for JSON-RPC / Hashio)
const hederaEVMAdapter = new HederaAdapter({
    projectId,
    networks: [HederaChainDefinition.EVM.Testnet],
    namespace: 'eip155',
});

// 2. Setup Native Adapter (for HIP-820 / Native Wallet Discovery)
const hederaNativeAdapter = new HederaAdapter({
    projectId,
    networks: [HederaChainDefinition.Native.Testnet],
    namespace: hederaNamespace,
});

// Polyfill global for libraries that expect it
if (typeof window !== 'undefined' && !window.global) {
    (window as any).global = window;
}

// Global appKit instance
export let appKit: any;

export function WalletConnectProvider({ children }: { children: React.ReactNode }) {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        let isMounted = true;
        async function initAppKit() {
            try {
                // Initialize the Universal Provider bridge (Required for Hedera bridge)
                const up = await HederaProvider.init({
                    projectId,
                    metadata,
                });

                if (!isMounted) return;

                // Create the AppKit instance with both namespaces
                appKit = createAppKit({
                    adapters: [hederaEVMAdapter, hederaNativeAdapter],
                    // @ts-ignore - Bridge to native Hedera wallets
                    universalProvider: up as unknown as UniversalProvider,
                    networks: [
                        HederaChainDefinition.EVM.Testnet,
                        HederaChainDefinition.Native.Testnet
                    ],
                    defaultNetwork: HederaChainDefinition.EVM.Testnet,
                    metadata,
                    projectId,
                    features: {
                        analytics: true,
                        email: false,
                        socials: false,
                    },
                    allWallets: 'SHOW'
                });

                setIsReady(true);
            } catch (error) {
                console.error("Failed to initialize AppKit with Hedera:", error);
            }
        }
        initAppKit();
        return () => { isMounted = false; };
    }, []);

    // We keep children around but only render NetworkGuard once ready
    return (
        <QueryClientProvider client={queryClient}>
            {isReady && <NetworkGuard />}
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
