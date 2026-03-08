import { createAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { defineChain, hederaTestnet as hederaNative } from '@reown/appkit/networks'
import React, { useEffect } from 'react';

// Removed global interface to avoid clashing with existing types.
// We will use (window as any).ethereum instead.

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
    url: typeof window !== 'undefined' ? window.location.origin : 'https://hashplay-ai.vercel.app/',
    icons: ['https://avatars.githubusercontent.com/u/37784886']
};

export const appKit = createAppKit({
    adapters: [new EthersAdapter()],
    networks: [hederaTestnet, hederaNative],
    defaultNetwork: hederaTestnet,
    metadata,
    projectId,
    features: {
        analytics: true,
        email: false,
        socials: false,
    },
    allWallets: 'SHOW'
})

/**
 * Pre-flight check: Ensures Metamask is on Hedera Testnet BEFORE opening the modal.
 * This prevents the "Invalid Address" and connection errors for EVM wallets.
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
    return true; // Not a browser wallet, let AppKit handle it
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

export function WalletConnectProvider({ children }: { children: React.ReactNode }) {
    return (
        <>
            <NetworkGuard />
            {children}
        </>
    );
}
