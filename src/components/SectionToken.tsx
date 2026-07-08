import { useState, useEffect } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { appKitInstance } from '../context/WalletConnectContext';
import { BrowserProvider, Contract, formatUnits, parseUnits, parseEther } from 'ethers';
import PlayTokenArtifact from '../contracts/PlayToken.json';

const PLAY_TOKEN_ADDRESS = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";

export default function SectionToken() {
  const { isConnected, address } = useAppKitAccount();
  const [supply, setSupply] = useState<string>("0");
  const [balance, setBalance] = useState<string>("0");
  const [price, setPrice] = useState<string>("0.0001");
  const [marketCap, setMarketCap] = useState<string>("0");
  const holders = "426+";

  // Swap State
  const [swapMode, setSwapMode] = useState<'buy' | 'sell'>('buy');
  const [swapAmount, setSwapAmount] = useState<string>('');
  const [isSwapping, setIsSwapping] = useState(false);

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

  const handleSwap = async () => {
    if (!isConnected || !address) return alert("Please connect your wallet first.");
    if (!swapAmount || isNaN(Number(swapAmount)) || Number(swapAmount) <= 0) return alert("Enter a valid amount.");

    setIsSwapping(true);
    try {
      const provider = appKitInstance.getWalletProvider();
      const ethersProvider = new BrowserProvider(provider as any);
      const signer = await ethersProvider.getSigner();
      const playToken = new Contract(PLAY_TOKEN_ADDRESS, PlayTokenArtifact.abi, signer);

      if (swapMode === 'buy') {
        const tx = await playToken.buy({ value: parseEther(swapAmount) });
        await tx.wait();
        alert("Successfully bought $PLAY!");
      } else {
        const tx = await playToken.sell(parseUnits(swapAmount, 8));
        await tx.wait();
        alert("Successfully sold $PLAY!");
      }
      setSwapAmount('');
      fetchTokenData();
    } catch (e: any) {
      console.error(e);
      alert("Swap failed. Check console for details.");
    } finally {
      setIsSwapping(false);
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

          <div className="flex flex-col gap-4 min-w-[300px]">
            <div className="flex bg-black/50 p-1 rounded-xl">
              <button 
                onClick={() => setSwapMode('buy')}
                className={`flex-1 py-2 font-bold rounded-lg transition-all ${swapMode === 'buy' ? 'bg-hedera-green text-black' : 'text-white/60 hover:text-white'}`}
              >
                Buy PLAY
              </button>
              <button 
                onClick={() => setSwapMode('sell')}
                className={`flex-1 py-2 font-bold rounded-lg transition-all ${swapMode === 'sell' ? 'bg-red-500 text-white' : 'text-white/60 hover:text-white'}`}
              >
                Sell PLAY
              </button>
            </div>
            
            <div className="flex flex-col gap-2 relative">
              <input 
                type="number"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                placeholder={`Amount in ${swapMode === 'buy' ? 'HBAR' : 'PLAY'}`}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold placeholder:text-white/20 outline-none focus:border-hedera-green transition-colors"
                disabled={isSwapping}
              />
              <button 
                onClick={handleSwap}
                disabled={isSwapping || !swapAmount}
                className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-black bg-hedera-green hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSwapping ? 'Swapping...' : `Confirm ${swapMode}`}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Tokenomics Breakdown */}
      <div className="w-full mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <div className="glass-panel p-8 rounded-[2rem] border border-emerald-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full group-hover:bg-emerald-500/20 transition-colors" />
          <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            Fair Launch Model
          </h3>
          <ul className="space-y-4">
            <li className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-white/60 font-medium">Community Airdrop</span>
              <span className="text-emerald-400 font-bold">100% (20,000,000 PLAY)</span>
            </li>
            <li className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-white/60 font-medium">Team Allocation</span>
              <span className="text-white font-bold">0%</span>
            </li>
            <li className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-white/60 font-medium">Pre-Sale</span>
              <span className="text-white font-bold">0%</span>
            </li>
            <li className="flex justify-between items-center pt-2">
              <span className="text-white/60 font-medium">Liquidity Mechanism</span>
              <span className="text-blue-400 font-bold">Protocol-Owned Curve</span>
            </li>
          </ul>
        </div>

        <div className="glass-panel p-8 rounded-[2rem] border border-orange-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] rounded-full group-hover:bg-orange-500/20 transition-colors" />
          <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-orange-400" fill="currentColor" viewBox="0 0 24 24"><path d="M17.5 19.5A7.5 7.5 0 0 0 10 12V3a7.5 7.5 0 0 0-7.5 7.5v9h15z"/></svg>
            Hyper-Deflationary Sink
          </h3>
          <p className="text-white/60 leading-relaxed mb-6">
            $PLAY utilizes a revolutionary Auto-Buyback mechanism built directly into the Arena Smart Contract.
          </p>
          <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0 mt-1">
              <span className="text-orange-400 font-black">2.5%</span>
            </div>
            <p className="text-sm text-white/80">
              Of all HBAR lost in the Arena is automatically routed to instantly buy $PLAY from the open market and send it to a permanent burn address, guaranteeing constant buy pressure.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
