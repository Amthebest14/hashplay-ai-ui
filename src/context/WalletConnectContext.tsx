// @ts-nocheck
import { createWeb3Modal, defaultConfig, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { HashConnect, HashConnectConnectionState, SessionData } from 'hashconnect';

// Get Project ID from .env
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

if (!projectId) {
    console.error("Missing VITE_WALLETCONNECT_PROJECT_ID in environment variables");
}

// 2. Set chains
const hederaTestnet = {
    chainId: 296,
    name: 'Hedera Testnet',
    currency: 'HBAR',
    explorerUrl: 'https://hashscan.io/testnet',
    rpcUrl: 'https://testnet.hashio.io/api'
};

// 3. Create a metadata object
export const metadata = {
    name: 'Hashplay AI',
    description: 'AI-Powered On-Chain Gaming Arena on Hedera',
    url: 'https://hashplay-ai-ui.vercel.app/', // MUST EXACTLY MATCH LIVE URL FOR HASHPACK SECURITY
    icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// 4. Create Ethers config
const ethersConfig = defaultConfig({
    metadata,
    enableEIP6963: true,
    enableInjected: true,
    enableCoinbase: false,
    rpcUrl: 'https://testnet.hashio.io/api',
    defaultChainId: 296
});

// 5. Create Web3Modal instance
createWeb3Modal({
    ethersConfig,
    chains: [hederaTestnet],
    projectId,
    enableAnalytics: true,
    themeMode: 'dark',
    featuredWalletIds: [
        '1ddc8119eb4ee7d65698b3d881510e1f38aca167905d4f10738e4df5e2fbdd21', // HashPack
    ],
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
    ]
});

// --- HashConnect Initialization ---
export const hashconnect = new HashConnect(
    "testnet",
    projectId,
    metadata,
    true
);

interface DualWalletContextType {
    isHCConnected: boolean;
    hcSessionData: SessionData | null;
    hcState: HashConnectConnectionState;
    connectHashConnect: () => void;
    disconnectHashConnect: () => void;
    // Unified state
    unifiedAddress: string | null;
    isUnifiedConnected: boolean;
}

const DualWalletContext = createContext<DualWalletContextType | null>(null);

export function WalletConnectProvider({ children }: { children: React.ReactNode }) {
    const [hcState, setHcState] = useState<HashConnectConnectionState>(HashConnectConnectionState.Disconnected);
    const [hcSessionData, setHcSessionData] = useState<SessionData | null>(null);
    const [isHCConnected, setIsHCConnected] = useState(false);

    const { address: w3mAddress, isConnected: w3mIsConnected } = useWeb3ModalAccount();

    useEffect(() => {
        // Init HashConnect
        hashconnect.init();

        // Listen for events
        hashconnect.connectionStatusChangeEvent.on((newStatus) => {
            setHcState(newStatus);
            setIsHCConnected(newStatus === HashConnectConnectionState.Connected);
        });

        hashconnect.pairingEvent.on((newPairing) => {
            setHcSessionData(newPairing);
        });

    }, []);

    const connectHashConnect = async () => {
        try {
            console.log("Triggering HashConnect openPairingModal...");
            await hashconnect.openPairingModal();
            console.log("HashConnect modal resolved.");
        } catch (error: any) {
            console.error("HashConnect Connection Error:", error);
            alert(`HashConnect Failed: ${error?.message || error}`);
        }
    };

    const disconnectHashConnect = async () => {
        if (hcSessionData?.topic) {
            await hashconnect.disconnect(hcSessionData.topic);
            setHcSessionData(null);
            setIsHCConnected(false);
            setHcState(HashConnectConnectionState.Disconnected);
        }
    };

    // Calculate unified address (prioritizing HashConnect)
    const hcAddressEVM = hcSessionData?.accountIds?.[0]
        ? `0x${hcSessionData.accountIds[0]}` // Note: We will need a proper Hedera-to-EVM conversion later if EVM address is strictly required, but HashPlay Mirror node handles standard Account IDs too, or we can use Hedera format directly. 
        : null;

    const unifiedAddress = isHCConnected ? hcSessionData?.accountIds?.[0] || null : w3mAddress || null;
    const isUnifiedConnected = isHCConnected || w3mIsConnected;

    const value = {
        isHCConnected,
        hcSessionData,
        hcState,
        connectHashConnect,
        disconnectHashConnect,
        unifiedAddress,
        isUnifiedConnected
    };

    return (
        <DualWalletContext.Provider value={value}>
            {children}
        </DualWalletContext.Provider>
    );
}

// Hook to access the Dual Wallet state
export const useDualWallet = () => {
    const context = useContext(DualWalletContext);
    if (!context) {
        throw new Error("useDualWallet must be used within a WalletConnectProvider");
    }

    // Also export Web3Modal provider hook for convenience to use in contractService
    const { walletProvider: w3mProvider } = useWeb3ModalProvider();

    return { ...context, w3mProvider };
};
