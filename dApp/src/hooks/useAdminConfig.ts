import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { NoxEscrowFactoryABI } from '../contracts/NoxEscrowFactory';

interface UseAdminConfigParams {
  walletAddress: string | null;
  factoryAddress: string;
  cUSDCAddress: string;
  getWeb3Signer: () => Promise<ethers.JsonRpcSigner>;
  setErrorMessage: (msg: string | null) => void;
  setSuccessMessage: (msg: string | null) => void;
}

export function useAdminConfig({
  walletAddress,
  factoryAddress,
  cUSDCAddress,
  getWeb3Signer,
  setErrorMessage,
  setSuccessMessage
}: UseAdminConfigParams) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Factory parameters state
  const [currentImplementation, setCurrentImplementation] = useState("");
  const [currentRegistry, setCurrentRegistry] = useState("");
  const [currentUSDCToken, setCurrentUSDCToken] = useState("");
  const [currentReviewWindow, setCurrentReviewWindow] = useState("");
  const [currentMutualCancelWindow, setCurrentMutualCancelWindow] = useState("");
  const [currentTeeArbiter, setCurrentTeeArbiter] = useState("");
  const [currentPlatformFeeBps, setCurrentPlatformFeeBps] = useState("50");
  const [currentTreasury, setCurrentTreasury] = useState("");

  const [newImplementationInput, setNewImplementationInput] = useState("");
  const [newRegistryInput, setNewRegistryInput] = useState("");
  const [newUSDCTokenInput, setNewUSDCTokenInput] = useState("");
  const [newReviewWindowInput, setNewReviewWindowInput] = useState("259200");
  const [newMutualCancelWindowInput, setNewMutualCancelWindowInput] = useState("604800");
  const [newTeeArbiterInput, setNewTeeArbiterInput] = useState("");
  const [newPlatformFeeBpsInput, setNewPlatformFeeBpsInput] = useState("50");
  const [newTreasuryInput, setNewTreasuryInput] = useState("");

  const checkAdminStatus = useCallback(async () => {
    if (!walletAddress) return;

    try {
      const signer = await getWeb3Signer();
      const factory = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
      const owner = await factory.owner();
      if (owner.toLowerCase() === walletAddress.toLowerCase()) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.warn("Could not query factory owner from contract:", err);
      setIsAdmin(false);
    }
  }, [walletAddress, factoryAddress, getWeb3Signer]);

  const loadFactoryParams = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const signer = await getWeb3Signer();
      const factory = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
      const [impl, reg, token, win, cancelWin, arbiter, feeBps, treasuryAddr] = await Promise.all([
        factory.escrowImplementation(),
        factory.reputationRegistry(),
        factory.cUSDCToken(),
        factory.reviewWindow(),
        factory.mutualCancelWindow(),
        factory.canonicalTeeArbiter(),
        factory.platformFeeBps(),
        factory.treasury()
      ]);
      setCurrentImplementation(impl);
      setCurrentRegistry(reg);
      setCurrentUSDCToken(token);
      setCurrentReviewWindow(win.toString());
      setCurrentMutualCancelWindow(cancelWin.toString());
      setCurrentTeeArbiter(arbiter);
      setCurrentPlatformFeeBps(feeBps.toString());
      setCurrentTreasury(treasuryAddr);
      
      // Seed inputs
      setNewImplementationInput(impl);
      setNewRegistryInput(reg);
      setNewUSDCTokenInput(token);
      setNewReviewWindowInput(win.toString());
      setNewMutualCancelWindowInput(cancelWin.toString());
      setNewTeeArbiterInput(arbiter);
      setNewPlatformFeeBpsInput(feeBps.toString());
      setNewTreasuryInput(treasuryAddr);
    } catch (err) {
      console.warn("Could not load factory params from contract:", err);
      // Fallback
      setCurrentImplementation("");
      setCurrentRegistry("");
      setCurrentUSDCToken(cUSDCAddress);
      setCurrentReviewWindow("259200");
      setCurrentMutualCancelWindow("604800");
    }
  }, [walletAddress, factoryAddress, cUSDCAddress, getWeb3Signer]);

  const handleUpdateImplementation = async (newVal: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const signer = await getWeb3Signer();
      const factory = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
      const tx = await factory.setEscrowImplementation(newVal);
      setSuccessMessage("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      setSuccessMessage("✔️ Escrow Implementation template updated on-chain successfully!");
      await loadFactoryParams();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update implementation address.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRegistry = async (newVal: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const signer = await getWeb3Signer();
      const factory = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
      const tx = await factory.setReputationRegistry(newVal);
      setSuccessMessage("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      setSuccessMessage("✔️ Reputation Registry updated on-chain successfully!");
      await loadFactoryParams();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update reputation registry address.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUSDCToken = async (newVal: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const signer = await getWeb3Signer();
      const factory = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
      const tx = await factory.setUSDCToken(newVal);
      setSuccessMessage("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      setSuccessMessage("✔️ Confidential cUSDC Token updated on-chain successfully!");
      await loadFactoryParams();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update USDC token address.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateReviewWindow = async (newVal: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const signer = await getWeb3Signer();
      const factory = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
      const tx = await factory.setReviewWindow(BigInt(newVal));
      setSuccessMessage("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      setSuccessMessage("✔️ Default Review Window updated on-chain successfully!");
      await loadFactoryParams();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update default review window.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMutualCancelWindow = async (newVal: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const signer = await getWeb3Signer();
      const factory = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
      const tx = await factory.setMutualCancelWindow(BigInt(newVal));
      setSuccessMessage("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      setSuccessMessage("✔️ Default Mutual Cancellation Window updated on-chain successfully!");
      await loadFactoryParams();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update default mutual cancellation window.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTeeArbiter = async (newVal: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const signer = await getWeb3Signer();
      const factory = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
      const tx = await factory.setCanonicalTeeArbiter(newVal);
      setSuccessMessage("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      setSuccessMessage("✔️ Canonical TEE Arbiter updated on-chain successfully!");
      await loadFactoryParams();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update canonical TEE arbiter.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePlatformFeeBps = async (newVal: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const signer = await getWeb3Signer();
      const factory = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
      const tx = await factory.setPlatformFeeBps(BigInt(newVal));
      setSuccessMessage("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      setSuccessMessage("✔️ Platform Fee updated on-chain successfully!");
      await loadFactoryParams();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update platform fee.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTreasury = async (newVal: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const signer = await getWeb3Signer();
      const factory = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
      const tx = await factory.setTreasury(newVal);
      setSuccessMessage("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      setSuccessMessage("✔️ Protocol Treasury updated on-chain successfully!");
      await loadFactoryParams();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update treasury address.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAdmin,
    isLoading,
    
    // Factory Params
    currentImplementation,
    currentRegistry,
    currentUSDCToken,
    currentReviewWindow,
    currentMutualCancelWindow,
    currentTeeArbiter,
    currentPlatformFeeBps,
    currentTreasury,

    // Inputs
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

    // Methods
    checkAdminStatus,
    loadFactoryParams,
    handleUpdateImplementation,
    handleUpdateRegistry,
    handleUpdateUSDCToken,
    handleUpdateReviewWindow,
    handleUpdateMutualCancelWindow,
    handleUpdateTeeArbiter,
    handleUpdatePlatformFeeBps,
    handleUpdateTreasury
  };
}
export default useAdminConfig;
