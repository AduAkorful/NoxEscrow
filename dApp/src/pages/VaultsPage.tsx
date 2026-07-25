import { useNavigate } from 'react-router-dom';
import { PortfolioFeed } from '../components/PortfolioFeed';
import { type EscrowContract } from '../services/escrowService';

interface VaultsPageProps {
  activeEscrows: EscrowContract[];
  isFetchingContracts: boolean;
  viewMode: 'client' | 'freelancer';
  vaultKey?: string | null;
  onDeriveKey?: () => void;
}

export function VaultsPage({ activeEscrows, isFetchingContracts, viewMode, vaultKey, onDeriveKey }: VaultsPageProps) {
  const navigate = useNavigate();
  return (
    <PortfolioFeed
      activeEscrows={activeEscrows}
      isFetchingContracts={isFetchingContracts}
      viewMode={viewMode}
      setSelectedContract={(escrow) => navigate(`/escrow/${escrow.address}`)}
      vaultKey={vaultKey}
      onDeriveKey={onDeriveKey}
    />
  );
}

export default VaultsPage;
