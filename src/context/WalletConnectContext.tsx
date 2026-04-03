import { createAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { hedera, hederaTestnet, sepolia } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http } from 'viem'
import React, { useEffect } from 'react';

// Setup queryClient
const queryClient = new QueryClient()

// Get Project ID (Hardcoded to prevent Vercel ENV pipeline newline corruption)
const projectId = '90f7c21eef9af7a0b4ae6f05eb8e9f88';

// Determine Active Network from Environment
const isMainnet = import.meta.env.VITE_NETWORK === 'mainnet';
const activeNetwork = isMainnet ? hedera : hederaTestnet;
const targetChainIdDecimal = activeNetwork.id; // 295 for mainnet, 296 for testnet
const targetChainIdHex = isMainnet ? '0x127' : '0x128';

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
    networks: [activeNetwork, sepolia],
    transports: {
        [activeNetwork.id]: http(),
        [sepolia.id]: http()
    }
});

// Initialize AppKit instance
export const appKitInstance = createAppKit({
    adapters: [wagmiAdapter],
    networks: [activeNetwork, sepolia],
    defaultNetwork: activeNetwork,
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
    featuredWalletIds: ['bf33f966-2679-45e0-a034-72648796447e'],
    allowUnsupportedChain: true,
    enableWalletConnect: true,
    enableInjected: true,
});

// EIP-6963 Runtime Diagnostics & Versioning
if (typeof window !== 'undefined') {
    console.log(`💎 Hashplay AI - Wallet Engine v2.7 [${isMainnet ? 'MAINNET' : 'TESTNET'}] ACTIVE`);
    window.addEventListener('eip6963:announceProvider', (event: any) => {
        console.log('🚀 Hedera Wallet Detected:', event.detail.info.name);
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
 * Pre-flight check: Ensures Wallet is on Correct Hedera Network BEFORE opening the modal.
 */
export async function ensureHederaNetwork() {
    if ((window as any).ethereum) {
        try {
            await (window as any).ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: targetChainIdHex }],
            });
            return true;
        } catch (switchError: any) {
            if (switchError.code === 4902) {
                try {
                    await (window as any).ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: targetChainIdHex,
                                chainName: isMainnet ? 'Hedera Mainnet' : 'Hedera Testnet',
                                nativeCurrency: {
                                    name: 'HBAR',
                                    symbol: 'HBAR',
                                    decimals: 18,
                                },
                                rpcUrls: [isMainnet ? 'https://mainnet.hashio.io/api' : 'https://testnet.hashio.io/api'],
                                blockExplorerUrls: [isMainnet ? 'https://hashscan.io/mainnet' : 'https://hashscan.io/testnet'],
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
            if (isConnected && (window as any).ethereum && caipNetwork?.id !== targetChainIdDecimal) {
                await ensureHederaNetwork();
            }
        };

        const timer = setTimeout(checkNetwork, 1000);
        return () => clearTimeout(timer);
    }, [isConnected, caipNetwork?.id]);

    return null;
}
