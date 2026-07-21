import { useParams, useNavigate } from 'react-router-dom';
import { EscrowWorkspace } from '../components/EscrowWorkspace';
import { type EscrowContract } from '../services/escrowService';
import { Loader2, ArrowLeft } from 'lucide-react';

interface EscrowPageProps {
  contractsList: EscrowContract[];
  walletAddress: string | null;
  viewMode: 'client' | 'freelancer';
  disputeStatement: string;
  setDisputeStatement: (val: string) => void;
  deliverableInput: string;
  setDeliverableInput: (val: string) => void;
  ratingInput: number;
  setRatingInput: (val: number) => void;
  isLoading: boolean;
  handleRaiseDispute: () => Promise<void>;
  handleSubmitDeliverable: () => Promise<void>;
  handleReleaseMilestone: () => Promise<void>;
  handleMutualCancel?: (address?: string) => Promise<void>;
  deliverableFiles: File[];
  setDeliverableFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

export function EscrowPage({
  contractsList,
  walletAddress,
  viewMode,
  disputeStatement,
  setDisputeStatement,
  deliverableInput,
  setDeliverableInput,
  ratingInput,
  setRatingInput,
  isLoading,
  handleRaiseDispute,
  handleSubmitDeliverable,
  handleReleaseMilestone,
  handleMutualCancel,
  deliverableFiles,
  setDeliverableFiles
}: EscrowPageProps) {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();

  const matchedContract = contractsList.find(
    c => c.address.toLowerCase() === address?.toLowerCase()
  );

  if (!matchedContract) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="uniswap-card p-10 flex flex-col items-center justify-center gap-5 text-center">
          <Loader2 className="w-10 h-10 text-[#38BDF8] animate-spin" />
          <div>
            <h3 className="text-lg font-bold text-white">
              Loading Escrow Vault
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-mono break-all max-w-md">
              Decrypting parameters for {address}
            </p>
          </div>
          <button
            onClick={() => navigate('/vaults')}
            className="btn-uniswap-secondary px-5 py-2.5 text-xs flex items-center gap-2 cursor-pointer mt-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Vaults
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <EscrowWorkspace
        selectedContract={matchedContract}
        walletAddress={walletAddress}
        viewMode={viewMode}
        disputeStatement={disputeStatement}
        setDisputeStatement={setDisputeStatement}
        deliverableInput={deliverableInput}
        setDeliverableInput={setDeliverableInput}
        ratingInput={ratingInput}
        setRatingInput={setRatingInput}
        isLoading={isLoading}
        handleRaiseDispute={handleRaiseDispute}
        handleSubmitDeliverable={handleSubmitDeliverable}
        handleReleaseMilestone={handleReleaseMilestone}
        handleMutualCancel={handleMutualCancel}
        onBack={() => navigate('/vaults')}
        deliverableFiles={deliverableFiles}
        setDeliverableFiles={setDeliverableFiles}
      />
    </div>
  );
}
export default EscrowPage;
