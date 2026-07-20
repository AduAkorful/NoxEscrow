import { useParams, useNavigate } from 'react-router-dom';
import { EscrowWorkspace } from '../components/EscrowWorkspace';
import { type EscrowContract } from '../services/escrowService';

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
      <div className="bento-card p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[400px]">
        <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-[#00F2FE] animate-spin mb-2"></div>
        <h3 className="font-mono text-sm tracking-widest text-[#00F2FE] uppercase font-bold">
          LOADING_SECURE_ESCROW_NODE
        </h3>
        <p className="text-xs text-slate-400 font-sans max-w-sm">
          Fetching and decrypting the zero-knowledge parameters for contract at <br />
          <span className="font-mono text-[#7F00FF] break-all">{address}</span>
        </p>
        <button
          onClick={() => navigate('/vaults')}
          className="mt-4 px-4 py-2 border border-white/5 hover:border-white/25 rounded-xl font-mono text-[10px] text-slate-400 hover:text-white uppercase tracking-wider transition-smooth cursor-pointer"
        >
          Return to Vaults
        </button>
      </div>
    );
  }

  return (
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
      onBack={() => navigate('/vaults')}
      deliverableFiles={deliverableFiles}
      setDeliverableFiles={setDeliverableFiles}
    />
  );
}
export default EscrowPage;
