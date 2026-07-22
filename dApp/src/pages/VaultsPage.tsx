import { useNavigate } from 'react-router-dom';
import { PortfolioFeed } from '../components/PortfolioFeed';
import { type EscrowContract } from '../services/escrowService';

interface VaultsPageProps {
  activeEscrows: EscrowContract[];
  isFetchingContracts: boolean;
  viewMode: 'client' | 'freelancer';
}

export function VaultsPage({ activeEscrows, isFetchingContracts, viewMode }: VaultsPageProps) {
  const navigate = useNavigate();
  return (
    <PortfolioFeed
      activeEscrows={activeEscrows}
      isFetchingContracts={isFetchingContracts}
      viewMode={viewMode}
      setSelectedContract={(escrow) => navigate(`/escrow/${escrow.address}`)}
    />
  );
}

export default VaultsPage;
