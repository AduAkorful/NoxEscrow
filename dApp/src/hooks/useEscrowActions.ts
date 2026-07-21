import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  deployEscrowClone, 
  approveEscrowOperator, 
  initializeEscrowMilestones, 
  submitMilestoneDeliverable, 
  releaseEscrowMilestone, 
  raiseEscrowDispute, 
  executeMutualCancel,
  fetchUserEscrows,
  type EscrowContract
} from '../services/escrowService';
import { 
  updateEscrowStatement, 
  savePendingSync
} from '../services/metadataService';
import type { StepItem } from '../components/TransactionStepper';

interface UseEscrowActionsParams {
  walletAddress: string | null;
  getWeb3Signer: () => Promise<ethers.JsonRpcSigner>;
  supabaseUrl: string;
  supabaseKey: string;
  pinataJWT: string;
  factoryAddress: string;
  cUSDCAddress: string;
  gatewayUrl: string;
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  setErrorMessage: (msg: string | null) => void;
  setSuccessMessage: (msg: string | null) => void;
}

export function useEscrowActions({
  walletAddress,
  getWeb3Signer,
  supabaseUrl,
  supabaseKey,
  pinataJWT,
  factoryAddress,
  cUSDCAddress,
  gatewayUrl,
  addToast,
  setErrorMessage,
  setSuccessMessage
}: UseEscrowActionsParams) {
  const [contractsList, setContractsList] = useState<EscrowContract[]>([]);
  const [isFetchingContracts, setIsFetchingContracts] = useState(false);
  const [selectedContract, setSelectedContract] = useState<EscrowContract | null>(null);
  
  const [deliverableInput, setDeliverableInput] = useState("");
  const [deliverableFiles, setDeliverableFiles] = useState<File[]>([]);
  const [disputeStatement, setDisputeStatement] = useState("");
  const [ratingInput, setRatingInput] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  // Stepper state
  const [isStepperOpen, setIsStepperOpen] = useState(false);
  const [stepperTitle, setStepperTitle] = useState("TRANSACTION_PIPELINE_STATUS");
  const [stepperSteps, setStepperSteps] = useState<StepItem[]>([]);
  const [stepperSubtext, setStepperSubtext] = useState("");

  const loadOnChainContracts = useCallback(async () => {
    if (!walletAddress) return;
    
    setIsFetchingContracts(true);
    setErrorMessage(null);

    try {
      const signer = await getWeb3Signer();
      const escrows = await fetchUserEscrows(
        signer,
        factoryAddress,
        walletAddress,
        gatewayUrl,
        {
          pinataJWT,
          supabaseUrl,
          supabaseKey
        }
      );
      setContractsList(escrows);
    } catch (err: any) {
      console.error("Failed to load live on-chain contracts:", err);
      setContractsList([]);
      setErrorMessage(err.message || "Failed to retrieve live contracts from the blockchain network.");
    } finally {
      setIsFetchingContracts(false);
    }
  }, [walletAddress, factoryAddress, gatewayUrl, pinataJWT, supabaseUrl, supabaseKey, getWeb3Signer, setErrorMessage]);

  // Handle active contract selection updates if contracts list changes
  useEffect(() => {
    if (selectedContract) {
      const updated = contractsList.find(c => c.address.toLowerCase() === selectedContract.address.toLowerCase());
      if (updated) {
        setSelectedContract(updated);
      }
    }
  }, [contractsList, selectedContract]);

  const handleDeployEscrow = useCallback(async (
    draftFreelancer: string,
    draftTotalMilestones: number,
    draftMilestonePayouts: string,
    draftMilestoneReqs: string,
    draftFiles: File[],
    setDraftFiles: React.Dispatch<React.SetStateAction<File[]>>,
    setShowDraftWizard: (show: boolean) => void
  ) => {
    if (!walletAddress) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    // Initialize Stepper
    setIsStepperOpen(true);
    setStepperTitle("DEPLOYING_ESCROW_PIPELINE");
    setStepperSubtext("Please authorize the 3 consecutive transactions in your wallet to deploy and initialize the secure escrow workspace.");
    const initSteps: StepItem[] = [
      { label: "Deploying Lightweight Escrow Clone on-chain", status: "active" },
      { label: "Approving Escrow Contract for cUSDC Payouts", status: "pending" },
      { label: "Encrypting Attachments & Initializing Milestones", status: "pending" }
    ];
    setStepperSteps(initSteps);

    try {
      const signer = await getWeb3Signer();
      
      const payouts = draftMilestonePayouts.split(',').map(p => Number(p.trim()));
      const requirements = draftMilestoneReqs.split(';').map(r => r.trim());

      if (payouts.length !== draftTotalMilestones || requirements.length !== draftTotalMilestones) {
        throw new Error("Length mismatch: Number of payouts and requirements must match total milestones count.");
      }

      const escrowAddress = await deployEscrowClone(
        signer,
        factoryAddress,
        draftFreelancer,
        draftTotalMilestones
      );

      // Transition to Step 2
      setStepperSteps([
        { label: "Deploying Lightweight Escrow Clone on-chain", status: "completed" },
        { label: "Approving Escrow Contract for cUSDC Payouts", status: "active" },
        { label: "Encrypting Attachments & Initializing Milestones", status: "pending" }
      ]);

      await approveEscrowOperator(signer, cUSDCAddress, escrowAddress);

      // Transition to Step 3
      setStepperSteps([
        { label: "Deploying Lightweight Escrow Clone on-chain", status: "completed" },
        { label: "Approving Escrow Contract for cUSDC Payouts", status: "completed" },
        { label: "Encrypting Attachments & Initializing Milestones", status: "active" }
      ]);

      await initializeEscrowMilestones(
        signer,
        escrowAddress,
        payouts,
        requirements,
        gatewayUrl,
        {
          pinataJWT,
          supabaseUrl,
          supabaseKey
        },
        draftFiles
      );

      const newContract: EscrowContract = {
        address: escrowAddress,
        counterparty: draftFreelancer,
        role: 'CLIENT',
        milestonesCompleted: 0,
        totalMilestones: draftTotalMilestones,
        budget: payouts.reduce((a, b) => a + b, 0),
        status: 'ACTIVE',
        requirements: requirements
      };

      setContractsList(prev => [newContract, ...prev]);
      setDraftFiles([]);
      setIsStepperOpen(false);
      addToast("✔️ Escrow deployed and initialized under zero-knowledge!", "success");
      setShowDraftWizard(false);
    } catch (err: any) {
      setIsStepperOpen(false);
      const errMsg = err.message || 'Failed to deploy escrow clone.';
      setErrorMessage(errMsg);
      addToast(`❌ Deployment failed: ${errMsg.slice(0, 100)}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, factoryAddress, cUSDCAddress, gatewayUrl, pinataJWT, supabaseUrl, supabaseKey, getWeb3Signer, addToast, setErrorMessage, setSuccessMessage]);

  const handleSubmitDeliverable = useCallback(async () => {
    if (!selectedContract) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const signer = await getWeb3Signer();
      setSuccessMessage("Encrypting and submitting milestone deliverable on-chain...");
      await submitMilestoneDeliverable(
        signer,
        selectedContract.address,
        selectedContract.milestonesCompleted,
        deliverableInput,
        gatewayUrl,
        {
          pinataJWT,
          supabaseUrl,
          supabaseKey
        },
        deliverableFiles
      );
      
      setContractsList(prev => prev.map(c => {
        if (c.address.toLowerCase() === selectedContract.address.toLowerCase()) {
          return { 
            ...c, 
            milestonesCompleted: Math.min(c.milestonesCompleted + 1, c.totalMilestones),
            activeMilestoneSubmitted: true
          };
        }
        return c;
      }));

      setSuccessMessage("✔️ Deliverable submitted successfully!");
      setDeliverableInput("");
      setDeliverableFiles([]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit deliverable.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedContract, deliverableInput, deliverableFiles, gatewayUrl, pinataJWT, supabaseUrl, supabaseKey, getWeb3Signer, setErrorMessage, setSuccessMessage]);

  const handleReleaseMilestone = useCallback(async () => {
    if (!selectedContract) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const signer = await getWeb3Signer();
      setSuccessMessage("Releasing cUSDC milestone payout and submitting rating...");
      await releaseEscrowMilestone(signer, selectedContract.address, ratingInput);
      
      setSuccessMessage("✔️ Milestone approved and released!");
      
      // Reload on-chain contracts to refresh state (e.g. is contract completed, how many milestones completed etc.)
      await loadOnChainContracts();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to release milestone.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedContract, ratingInput, getWeb3Signer, loadOnChainContracts, setErrorMessage, setSuccessMessage]);

  const handleRaiseDispute = useCallback(async () => {
    if (!selectedContract) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const signer = await getWeb3Signer();
      setSuccessMessage("Uploading dispute reasoning & statement to enclave sync...");
      
      const useE2E = supabaseUrl && supabaseKey;
      if (useE2E && disputeStatement.trim()) {
        const role = selectedContract.role === 'CLIENT' ? 'client' : 'freelancer';
        try {
          await updateEscrowStatement(
            supabaseUrl,
            supabaseKey,
            selectedContract.address,
            selectedContract.milestonesCompleted,
            role,
            disputeStatement.trim()
          );
        } catch (dbErr) {
          console.warn("Failed to sync dispute statement to Supabase, caching locally:", dbErr);
          savePendingSync({
            id: Math.random().toString(),
            type: "STATEMENT",
            escrowAddress: selectedContract.address,
            milestoneIndex: selectedContract.milestonesCompleted,
            data: { role, statement: disputeStatement.trim() }
          });
        }
      }

      setSuccessMessage("Transitioning state on-chain. Granting TEE Arbiter read keys...");
      await raiseEscrowDispute(signer, selectedContract.address);
      
      setContractsList(prev => prev.map(c => {
        if (c.address.toLowerCase() === selectedContract.address.toLowerCase()) {
          return { ...c, status: 'DISPUTED' };
        }
        return c;
      }));

      setSuccessMessage("⚠️ Formal Dispute Raised! Enclave AI Arbiter process initiated.");
      setDisputeStatement("");
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to raise dispute.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedContract, disputeStatement, supabaseUrl, supabaseKey, getWeb3Signer, setErrorMessage, setSuccessMessage]);

  const handleMutualCancel = useCallback(async (contractAddress?: string) => {
    const targetAddress = contractAddress || selectedContract?.address;
    if (!targetAddress) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const signer = await getWeb3Signer();
      await executeMutualCancel(signer, targetAddress);
      
      addToast("Mutual cancellation requested/confirmed on-chain.", "success");
      setSuccessMessage("✔️ Mutual cancellation status updated on-chain!");
      await loadOnChainContracts();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process mutual cancellation.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedContract, getWeb3Signer, loadOnChainContracts, addToast, setErrorMessage, setSuccessMessage]);

  return {
    contractsList,
    setContractsList,
    isFetchingContracts,
    selectedContract,
    setSelectedContract,
    deliverableInput,
    setDeliverableInput,
    deliverableFiles,
    setDeliverableFiles,
    disputeStatement,
    setDisputeStatement,
    ratingInput,
    setRatingInput,
    isLoading,
    setIsLoading,
    
    // Stepper State
    isStepperOpen,
    setIsStepperOpen,
    stepperTitle,
    stepperSteps,
    stepperSubtext,

    // Methods
    loadOnChainContracts,
    handleDeployEscrow,
    handleSubmitDeliverable,
    handleReleaseMilestone,
    handleRaiseDispute,
    handleMutualCancel
  };
}
