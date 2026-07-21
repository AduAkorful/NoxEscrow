import { TokenWrapper } from '../components/TokenWrapper';
import { ReputationGauge } from '../components/ReputationGauge';
import { EventLog } from '../components/EventLog';
import { ethers } from 'ethers';

interface SwapPageProps {
  walletAddress: string | null;
  cUSDCAddress: string;
  publicUSDCAddress: string;
  gatewayUrl: string;
  getWeb3Signer: () => Promise<ethers.JsonRpcSigner>;
  signer: ethers.JsonRpcSigner | null;
  reputationRegistryAddress: string;
  factoryAddress: string;
  contractsList: any[];
}

export function SwapPage({
  walletAddress,
  cUSDCAddress,
  publicUSDCAddress,
  gatewayUrl,
  getWeb3Signer,
  signer,
  reputationRegistryAddress,
  factoryAddress,
  contractsList
}: SwapPageProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col items-center gap-10">
      
      {/* Hero Section */}
      <div className="text-center flex flex-col items-center gap-3 max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
          Shielded Swaps & <span className="shiny-text">Encrypted Escrow</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Convert standard public USDC into confidential cUSDC shielded by zero-knowledge TEE computing before locking into NoxEscrow vaults.
        </p>
      </div>

      {/* Main Centered Grid */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Centered Swap Card Widget */}
        <div className="lg:col-span-7 flex justify-center w-full">
          <TokenWrapper
            walletAddress={walletAddress}
            cUSDCAddress={cUSDCAddress}
            publicUSDCAddress={publicUSDCAddress}
            gatewayUrl={gatewayUrl}
            getWeb3Signer={getWeb3Signer}
          />
        </div>

        {/* Right Side: Reputation & Event Logs */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full">
          <ReputationGauge
            signer={signer}
            reputationRegistryAddress={reputationRegistryAddress}
            walletAddress={walletAddress}
            gatewayUrl={gatewayUrl}
          />
          <EventLog
            signer={signer}
            factoryAddress={factoryAddress}
            contractsList={contractsList}
          />
        </div>

      </div>

    </div>
  );
}

export default SwapPage;
