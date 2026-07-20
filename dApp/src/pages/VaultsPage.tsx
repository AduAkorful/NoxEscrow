import { useNavigate } from 'react-router-dom';
import { PortfolioFeed } from '../components/PortfolioFeed';
import { type EscrowContract } from '../services/escrowService';

interface VaultsPageProps {
  activeEscrows: EscrowContract[];
  isFetchingContracts: boolean;
}

export function VaultsPage({ activeEscrows, isFetchingContracts }: VaultsPageProps) {
  const navigate = useNavigate();
  return (
    <PortfolioFeed
      activeEscrows={activeEscrows}
      isFetchingContracts={isFetchingContracts}
      setSelectedContract={(escrow) => navigate(`/escrow/${escrow.address}`)}
    />
  );
}
