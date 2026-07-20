import { useNavigate } from 'react-router-dom';
import { AdminConfig } from '../components/AdminConfig';

interface AdminPageProps {
  factoryAddress: string;
  currentImplementation: string;
  currentRegistry: string;
  currentUSDCToken: string;
  currentReviewWindow: string;
  currentMutualCancelWindow: string;
  currentTeeArbiter: string;
  currentPlatformFeeBps: string;
  currentTreasury: string;
  
  newImplementationInput: string;
  setNewImplementationInput: (val: string) => void;
  newRegistryInput: string;
  setNewRegistryInput: (val: string) => void;
  newUSDCTokenInput: string;
  setNewUSDCTokenInput: (val: string) => void;
  newReviewWindowInput: string;
  setNewReviewWindowInput: (val: string) => void;
  newMutualCancelWindowInput: string;
  setNewMutualCancelWindowInput: (val: string) => void;
  newTeeArbiterInput: string;
  setNewTeeArbiterInput: (val: string) => void;
  newPlatformFeeBpsInput: string;
  setNewPlatformFeeBpsInput: (val: string) => void;
  newTreasuryInput: string;
  setNewTreasuryInput: (val: string) => void;
  
  isLoading: boolean;
  handleUpdateImplementation: (newVal: string) => Promise<void>;
  handleUpdateRegistry: (newVal: string) => Promise<void>;
  handleUpdateUSDCToken: (newVal: string) => Promise<void>;
  handleUpdateReviewWindow: (newVal: string) => Promise<void>;
  handleUpdateMutualCancelWindow: (newVal: string) => Promise<void>;
  handleUpdateTeeArbiter: (newVal: string) => Promise<void>;
  handleUpdatePlatformFeeBps: (newVal: string) => Promise<void>;
  handleUpdateTreasury: (newVal: string) => Promise<void>;
  isAdmin: boolean;
}

export function AdminPage({
  factoryAddress,
  currentImplementation,
  currentRegistry,
  currentUSDCToken,
  currentReviewWindow,
  currentMutualCancelWindow,
  currentTeeArbiter,
  currentPlatformFeeBps,
  currentTreasury,
  newImplementationInput,
  setNewImplementationInput,
  newRegistryInput,
  setNewRegistryInput,
  newUSDCTokenInput,
  setNewUSDCTokenInput,
  newReviewWindowInput,
  setNewReviewWindowInput,
  newMutualCancelWindowInput,
  setNewMutualCancelWindowInput,
  newTeeArbiterInput,
  setNewTeeArbiterInput,
  newPlatformFeeBpsInput,
  setNewPlatformFeeBpsInput,
  newTreasuryInput,
  setNewTreasuryInput,
  isLoading,
  handleUpdateImplementation,
  handleUpdateRegistry,
  handleUpdateUSDCToken,
  handleUpdateReviewWindow,
  handleUpdateMutualCancelWindow,
  handleUpdateTeeArbiter,
  handleUpdatePlatformFeeBps,
  handleUpdateTreasury,
  isAdmin
}: AdminPageProps) {
  const navigate = useNavigate();

  if (!isAdmin) {
    return (
      <div className="bento-card p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[400px]">
        <h3 className="font-mono text-sm tracking-widest text-red-500 uppercase font-bold">
          ACCESS_DENIED_NODE
        </h3>
        <p className="text-xs text-slate-400 font-sans max-w-sm">
          You are not the designated factory owner. On-chain administrator methods are restricted to the deployer.
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
    <AdminConfig
      factoryAddress={factoryAddress}
      currentImplementation={currentImplementation}
      currentRegistry={currentRegistry}
      currentUSDCToken={currentUSDCToken}
      currentReviewWindow={currentReviewWindow}
      currentMutualCancelWindow={currentMutualCancelWindow}
      currentTeeArbiter={currentTeeArbiter}
      currentPlatformFeeBps={currentPlatformFeeBps}
      currentTreasury={currentTreasury}
      newImplementationInput={newImplementationInput}
      setNewImplementationInput={setNewImplementationInput}
      newRegistryInput={newRegistryInput}
      setNewRegistryInput={setNewRegistryInput}
      newUSDCTokenInput={newUSDCTokenInput}
      setNewUSDCTokenInput={setNewUSDCTokenInput}
      newReviewWindowInput={newReviewWindowInput}
      setNewReviewWindowInput={setNewReviewWindowInput}
      newMutualCancelWindowInput={newMutualCancelWindowInput}
      setNewMutualCancelWindowInput={setNewMutualCancelWindowInput}
      newTeeArbiterInput={newTeeArbiterInput}
      setNewTeeArbiterInput={setNewTeeArbiterInput}
      newPlatformFeeBpsInput={newPlatformFeeBpsInput}
      setNewPlatformFeeBpsInput={setNewPlatformFeeBpsInput}
      newTreasuryInput={newTreasuryInput}
      setNewTreasuryInput={setNewTreasuryInput}
      isLoading={isLoading}
      handleUpdateImplementation={handleUpdateImplementation}
      handleUpdateRegistry={handleUpdateRegistry}
      handleUpdateUSDCToken={handleUpdateUSDCToken}
      handleUpdateReviewWindow={handleUpdateReviewWindow}
      handleUpdateMutualCancelWindow={handleUpdateMutualCancelWindow}
      handleUpdateTeeArbiter={handleUpdateTeeArbiter}
      handleUpdatePlatformFeeBps={handleUpdatePlatformFeeBps}
      handleUpdateTreasury={handleUpdateTreasury}
      onClose={() => navigate('/vaults')}
    />
  );
}
export default AdminPage;
