import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits } from 'ethers';
import { useAppKitAccount } from '@reown/appkit/react';
import { appKitInstance } from '../context/WalletConnectContext';
import PlayTokenArtifact from '../contracts/PlayToken.json';

const PLAY_TOKEN_ADDRESS = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";

export default function SectionToken() {
  const { isConnected, address } = useAppKitAccount();
  const [supply, setSupply] = useState<string>("0");
  const [balance, setBalance] = useState<string>("0");
  const [price, setPrice] = useState<string>("0.0001");
  const [marketCap, setMarketCap] = useState<string>("0");
  const holders = "426+";

  useEffect(() => {
    fetchTokenData();
    // Refresh every 10 seconds
    const interval = setInterval(fetchTokenData, 10000);
    return () => clearInterval(interval);
  }, [isConnected, address]);

  const fetchTokenData = async () => {
    try {
      const provider = appKitInstance.getWalletProvider();
      let ethersProvider;
      if (provider) {
        ethersProvider = new BrowserProvider(provider as any);
      } else {
        // Fallback to Hashio RPC if wallet not connected
        ethersProvider = new BrowserProvider(window.ethereum || (window as any).hashconnect || null);
      }

      if (!ethersProvider) return; // Cannot fetch without a provider

      const playToken = new Contract(PLAY_TOKEN_ADDRESS, PlayTokenArtifact.abi, ethersProvider);
      
      const totalSupply = await playToken.totalSupply();
      const currentSupply = Number(formatUnits(totalSupply, 8));
      setSupply(currentSupply.toLocaleString(undefined, { maximumFractionDigits: 0 }));

      if (isConnected && address && provider) {
        const userBal = await playToken.balanceOf(address);
        setBalance(Number(formatUnits(userBal, 8)).toLocaleString(undefined, { maximumFractionDigits: 2 }));
      } else {
        setBalance("0");
      }

      // Fetch actual bonding curve price from contract
      const priceWei = await playToken.currentPrice();
      // Price is in wei. 1 HBAR = 1e18 wei.
      const priceHbar = Number(formatUnits(priceWei, 18));
      setPrice(priceHbar.toFixed(4));

      const mcap = currentSupply * priceHbar;
      setMarketCap(mcap.toLocaleString(undefined, { maximumFractionDigits: 0 }));
    } catch (e) {
      console.error("Error fetching token data:", e);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-12 z-10 pt-20 pb-40 px-4 animate-fade-in">
      
      {/* Header */}
      <div className="text-center space-y-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[150%] bg-hedera-green/10 blur-[120px] rounded-full pointer-events-none" />
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-hedera-green to-emerald-600 drop-shadow-[0_0_30px_rgba(0,193,110,0.4)] relative z-10">
          $PLAY
        </h1>
        <p className="text-sm md:text-lg text-emerald-400/80 font-bold tracking-[0.4em] uppercase relative z-10">
          The Deflationary Bonding Curve Token
        </p>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-4">
        
        {/* Market Cap */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group border border-emerald-500/20 hover:border-emerald-400/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <p className="text-xs text-white/40 tracking-[0.2em] uppercase font-bold">Market Cap</p>
          <div className="text-3xl md:text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            {marketCap}
          </div>
          <p className="text-emerald-400 font-bold text-xs tracking-widest">HBAR</p>
        </div>

        {/* Live Price */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group border border-blue-500/20 hover:border-blue-400/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <p className="text-xs text-white/40 tracking-[0.2em] uppercase font-bold">Live Price</p>
          <div className="text-3xl md:text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            {price}
          </div>
          <p className="text-blue-400 font-bold text-xs tracking-widest">HBAR / PLAY</p>
        </div>

        {/* Total Supply */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group border border-purple-500/20 hover:border-purple-400/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <p className="text-xs text-white/40 tracking-[0.2em] uppercase font-bold">Total Supply</p>
          <div className="text-3xl md:text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            {supply}
          </div>
          <p className="text-purple-400 font-bold text-xs tracking-widest">$PLAY</p>
        </div>

        {/* Holders */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group border border-pink-500/20 hover:border-pink-400/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-t from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <p className="text-xs text-white/40 tracking-[0.2em] uppercase font-bold">Total Holders</p>
          <div className="text-3xl md:text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            {holders}
          </div>
          <p className="text-pink-400 font-bold text-xs tracking-widest">PLAYERS</p>
        </div>

      </div>

      {/* User Balance Area */}
      <div className="w-full relative mt-8">
        <div className="absolute inset-0 bg-gradient-to-r from-hedera-green/20 via-transparent to-blue-500/20 blur-xl opacity-50 rounded-[3rem]" />
        <div className="glass-panel p-10 rounded-[3rem] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10 bg-black/40 backdrop-blur-md">
          
          <div className="flex flex-col gap-2">
            <p className="text-sm text-white/50 tracking-[0.2em] font-bold uppercase">Your Wallet Balance</p>
            <div className="flex items-end gap-4">
              <span className="text-5xl md:text-6xl font-black text-white tracking-tighter">{balance}</span>
              <span className="text-2xl text-hedera-green font-bold mb-2">$PLAY</span>
            </div>
            <p className="text-sm text-white/40 mt-2">
              ≈ {(parseFloat(balance.replace(/,/g, '')) * parseFloat(price)).toFixed(2)} HBAR Value
            </p>
          </div>

          <a 
            href={`https://www.saucerswap.finance/swap/HBAR/${PLAY_TOKEN_ADDRESS}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(0,193,110,0.4)]"
          >
            <div className="absolute inset-0 w-full h-full -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-shimmer" />
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-hedera-green/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex items-center gap-3 text-lg tracking-wider">
              Trade on SaucerSwap
              <svg className="w-5 h-5 text-hedera-green group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
          </a>

        </div>
      </div>

    </div>
  );
}
