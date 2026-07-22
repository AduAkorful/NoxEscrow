import { FreelancerMarketplace } from '../components/FreelancerMarketplace';

interface MarketplacePageProps {
  walletAddress: string | null;
  onHireFreelancer: (freelancerAddress: string) => void;
}

export function MarketplacePage({ walletAddress, onHireFreelancer }: MarketplacePageProps) {
  return (
    <div className="w-full">
      <FreelancerMarketplace
        walletAddress={walletAddress}
        onHireFreelancer={onHireFreelancer}
      />
    </div>
  );
}
