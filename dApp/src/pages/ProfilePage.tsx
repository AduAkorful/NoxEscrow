import { UserProfile } from '../components/UserProfile';

interface ProfilePageProps {
  walletAddress: string | null;
  onHireFreelancer: (freelancerAddress: string) => void;
}

export function ProfilePage({ walletAddress, onHireFreelancer }: ProfilePageProps) {
  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-7xl mx-auto">
      <UserProfile walletAddress={walletAddress} onHireFreelancer={onHireFreelancer} />
    </div>
  );
}
