import { TokenWrapper } from '../components/TokenWrapper';
import { ethers } from 'ethers';

interface SwapPageProps {
  walletAddress: string;
  cUSDCAddress: string;
  publicUSDCAddress: string;
  gatewayUrl: string;
  getWeb3Signer: () => Promise<ethers.JsonRpcSigner>;
}

export function SwapPage({
  walletAddress,
  cUSDCAddress,
  publicUSDCAddress,
  gatewayUrl,
  getWeb3Signer
}: SwapPageProps) {
  return (
    <TokenWrapper
      walletAddress={walletAddress}
      cUSDCAddress={cUSDCAddress}
      publicUSDCAddress={publicUSDCAddress}
      gatewayUrl={gatewayUrl}
      getWeb3Signer={getWeb3Signer}
    />
  );
}
export default SwapPage;
