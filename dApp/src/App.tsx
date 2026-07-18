import { useState, useEffect, useCallback } from 'react';
import { deriveEncryptionKey, SIGN_MESSAGE } from './crypto/keyDerivation';
import { 
  deployEscrowClone, 
  approveEscrowOperator, 
  initializeEscrowMilestones, 
  submitMilestoneDeliverable, 
  releaseEscrowMilestone, 
  raiseEscrowDispute, 
  fetchUserEscrows,
  DEFAULT_NOX_GATEWAY,
  type EscrowContract
} from './services/escrowService';
import { 
  updateEscrowStatement, 
  savePendingSync, 
  getPendingSyncs, 
  removePendingSync, 
  insertEscrowMetadata, 
  updateEscrowDeliverable 
} from './services/metadataService';
import { 
  AlertTriangle,
  Unlock
} from 'lucide-react';
import { ethers } from 'ethers';
import addresses from './contracts/addresses.json';
import { NoxEscrowFactoryABI } from './contracts/NoxEscrowFactory';
import { usePrivy, useWallets } from '@privy-io/react-auth';

// Sub-components
import { LandingPage } from './components/LandingPage';
import { KeyDerivationGate } from './components/KeyDerivationGate';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AdminConfig } from './components/AdminConfig';
import { DraftWizard } from './components/DraftWizard';
import { EscrowWorkspace } from './components/EscrowWorkspace';
import { PortfolioFeed } from './components/PortfolioFeed';
import { ReputationGauge } from './components/ReputationGauge';
import { EventLog } from './components/EventLog';
import { ShortcutsHUD } from './components/ShortcutsHUD';
import { Footer } from './components/Footer';
import { TransactionStepper } from './components/TransactionStepper';
import type { StepItem } from './components/TransactionStepper';
import { ToastContainer } from './components/ToastContainer';
import type { Toast } from './components/ToastContainer';
import { TokenWrapper } from './components/TokenWrapper';

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function App() {
  // --- Privy Hooks ---
  const { logout: privyLogout, login: loginPrivy, authenticated, user, ready } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets[0];
  const connectedAddress = activeWallet?.address || user?.wallet?.address || null;

  // --- Core Application States ---
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [vaultKey, setVaultKey] = useState<string | null>(null);
  const [isDeriving, setIsDeriving] = useState(false);
  const [viewMode, setViewMode] = useState<'client' | 'freelancer'>('client');
  const [showShortcutsHUD, setShowShortcutsHUD] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTokenWrapper, setShowTokenWrapper] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingContracts, setIsFetchingContracts] = useState(false);
  const [isUnsupportedNetwork, setIsUnsupportedNetwork] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  // --- Toast notifications state ---
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToasts(prev => [...prev, { id: Math.random().toString(), message, type }]);
  }, []);
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // --- Stepper Modal State ---
  const [isStepperOpen, setIsStepperOpen] = useState(false);
  const [stepperTitle, setStepperTitle] = useState("TRANSACTION_PIPELINE_STATUS");
  const [stepperSteps, setStepperSteps] = useState<StepItem[]>([]);
  const [stepperSubtext, setStepperSubtext] = useState("");

  // --- Factory Parameters State for Admin view & on-chain modification ---
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

  // --- API & E2E Config Constants from Env ---
  const pinataJWT = import.meta.env.VITE_PINATA_JWT || "";
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || "";

  // --- Contract Deployment Config Constants from Env/addresses.json ---
  const factoryAddress = import.meta.env.VITE_NOX_ESCROW_FACTORY || addresses.factory || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const cUSDCAddress = import.meta.env.VITE_CUSDC_TOKEN || addresses.cUSDC || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || addresses.gatewayUrl || DEFAULT_NOX_GATEWAY;
  const publicUSDCAddress = import.meta.env.VITE_PUBLIC_USDC_TOKEN || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  // Sync Privy connection with application walletAddress state
  useEffect(() => {
    if (authenticated && connectedAddress) {
      setWalletAddress(connectedAddress);
    } else if (!authenticated && walletAddress) {
      setWalletAddress(null);
      setVaultKey(null);
    }
  }, [authenticated, connectedAddress, walletAddress]);

  // Console logging state transitions for debugging connection issues
  useEffect(() => {
    console.log("NoxEscrow Privy Connection Debug:", {
      authenticated,
      userWalletAddress: user?.wallet?.address,
      activeWalletAddress: activeWallet?.address,
      connectedAddress,
      walletsCount: wallets.length,
      walletAddressState: walletAddress,
      vaultKey
    });
  }, [authenticated, user, activeWallet, connectedAddress, wallets, walletAddress, vaultKey]);

  // Enforce Sepolia network for connected wallet
  useEffect(() => {
    if (authenticated && activeWallet) {
      const currentChainId = activeWallet.chainId;
      const cleanChainId = currentChainId.includes(':') 
        ? currentChainId.split(':')[1] 
        : currentChainId;
      
      const chainIdNum = cleanChainId.startsWith('0x') 
        ? parseInt(cleanChainId, 16) 
        : parseInt(cleanChainId, 10);

      if (chainIdNum !== 11155111) {
        setIsUnsupportedNetwork(true);
        setErrorMessage("Please switch your wallet network to Sepolia to interact with NoxEscrow.");
        
        // Attempt automatic switch to Sepolia (11155111)
        activeWallet.switchChain(11155111)
          .then(() => {
            setIsUnsupportedNetwork(false);
            setErrorMessage(null);
          })
          .catch((err) => {
            console.error("Failed to switch chain to Sepolia:", err);
            setErrorMessage("Unsupported network. Please switch to Sepolia network in your wallet to continue.");
          });
      } else {
        setIsUnsupportedNetwork(false);
        // Clear unsupported network error if they switched successfully
        if (errorMessage === "Please switch your wallet network to Sepolia to interact with NoxEscrow." || 
            errorMessage === "Unsupported network. Please switch to Sepolia network in your wallet to continue.") {
          setErrorMessage(null);
        }
      }
    }
  }, [authenticated, activeWallet, errorMessage]);

  // Periodic background re-sync handler for cached metadata
  useEffect(() => {
    if (!walletAddress || !vaultKey || !supabaseUrl || !supabaseKey) return;

    const runSync = async () => {
      const syncs = getPendingSyncs();
      if (syncs.length === 0) return;

      console.log(`🔄 Found ${syncs.length} pending metadata records to sync...`);
      for (const sync of syncs) {
        try {
          if (sync.type === "INSERT") {
            await insertEscrowMetadata(supabaseUrl, supabaseKey, sync.data);
          } else if (sync.type === "UPDATE") {
            await updateEscrowDeliverable(supabaseUrl, supabaseKey, sync.escrowAddress, sync.milestoneIndex, sync.data.devsCid);
          } else if (sync.type === "STATEMENT") {
            await updateEscrowStatement(supabaseUrl, supabaseKey, sync.escrowAddress, sync.milestoneIndex, sync.data.role, sync.data.statement);
          }
          removePendingSync(sync.id);
          console.log(`✔️ Successfully synchronized pending record: ${sync.type} for ${sync.escrowAddress} Milestone ${sync.milestoneIndex}`);
        } catch (err) {
          console.error(`❌ Failed to sync pending record ${sync.id}:`, err);
        }
      }
    };

    runSync();
    const interval = setInterval(runSync, 30000);
    return () => clearInterval(interval);
  }, [walletAddress, vaultKey, supabaseUrl, supabaseKey]);

  // --- Dynamic Signer Resolution ---
  const getWeb3Signer = useCallback(async (): Promise<ethers.JsonRpcSigner> => {
    if (activeWallet) {
      const provider = await activeWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      return ethersProvider.getSigner();
    }
    const win = window as any;
    if (win.ethereum) {
      const provider = new ethers.BrowserProvider(win.ethereum);
      return provider.getSigner();
    }
    throw new Error("No web3 provider detected. Please connect your wallet via Privy or Sandbox.");
  }, [activeWallet]);

  // Sync Ethers signer from connected wallet address
  useEffect(() => {
    if (walletAddress) {
      getWeb3Signer()
        .then(setSigner)
        .catch(err => {
          console.warn("Failed to retrieve Ethers signer:", err);
          setSigner(null);
        });
    } else {
      setSigner(null);
    }
  }, [walletAddress, getWeb3Signer]);

  // --- Wizard Drafting States ---
  const [showDraftWizard, setShowDraftWizard] = useState(false);
  const [draftFreelancer, setDraftFreelancer] = useState("");
  const [draftTotalMilestones, setDraftTotalMilestones] = useState(1);
  const [draftMilestonePayouts, setDraftMilestonePayouts] = useState<string>("1000");
  const [draftMilestoneReqs, setDraftMilestoneReqs] = useState<string>("Build a responsive collapsible sidebar using React.");
  const [draftFiles, setDraftFiles] = useState<File[]>([]);

  // --- Active Contract Detail Workspace ---
  const [selectedContract, setSelectedContract] = useState<EscrowContract | null>(null);
  const [deliverableInput, setDeliverableInput] = useState("");
  const [deliverableFiles, setDeliverableFiles] = useState<File[]>([]);
  const [disputeStatement, setDisputeStatement] = useState("");
  const [ratingInput, setRatingInput] = useState(5);

  // --- Stateful Live On-Chain Contracts ---
  const [contractsList, setContractsList] = useState<EscrowContract[]>([]);

  // --- Actions ---
  const connectWallet = useCallback(async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUnsupportedNetwork(false);

    try {
      await loginPrivy();
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, 'Failed to connect wallet via Privy.'));
    }
  }, [loginPrivy]);

  const triggerKeyDerivation = useCallback(async () => {
    if (!walletAddress) return;
    setIsDeriving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let signature = '';
      if (activeWallet) {
        const provider = await activeWallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        signature = await signer.signMessage(SIGN_MESSAGE);
      } else {
        const win = window as any;
        if (win.ethereum) {
          const provider = new ethers.BrowserProvider(win.ethereum);
          const signer = await provider.getSigner();
          signature = await signer.signMessage(SIGN_MESSAGE);
        } else {
          throw new Error("No wallet provider available");
        }
      }

      const key = await deriveEncryptionKey(signature);
      setVaultKey(key);
      setSuccessMessage("Confidential key successfully derived! Environment unlocked.");
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, 'Key derivation failed.'));
    } finally {
      setIsDeriving(false);
    }
  }, [walletAddress, activeWallet]);

  // --- Keyboard Shortcuts Listener (Linear-style) ---
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'c' && !walletAddress) {
        e.preventDefault();
        connectWallet();
      } else if (key === 'c' && walletAddress && !vaultKey) {
        e.preventDefault();
        triggerKeyDerivation();
      } else if (key === 't' && vaultKey) {
        e.preventDefault();
        setViewMode(prev => prev === 'client' ? 'freelancer' : 'client');
      } else if (key === 'h') {
        e.preventDefault();
        setShowShortcutsHUD(prev => !prev);
      } else if (key === 'd' && vaultKey) {
        e.preventDefault();
        setSelectedContract(null);
        setShowDraftWizard(false);
        setShowTokenWrapper(false);
      } else if (key === 'escape') {
        e.preventDefault();
        setShowShortcutsHUD(false);
        setShowDraftWizard(false);
        setShowSettings(false);
        setShowTokenWrapper(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [walletAddress, vaultKey, connectWallet, triggerKeyDerivation]);

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
  }, [walletAddress, factoryAddress, gatewayUrl, pinataJWT, supabaseUrl, supabaseKey, getWeb3Signer]);

  // --- Dynamic On-Chain Contract & Admin Fetching ---
  useEffect(() => {
    if (vaultKey && walletAddress) {
      loadOnChainContracts();
      checkAdminStatus();
      loadFactoryParams();
    }
  }, [vaultKey, walletAddress, loadOnChainContracts, checkAdminStatus, loadFactoryParams]);

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

  // --- Escrow Lifecycle Transactions ---
  const handleDeployEscrow = async () => {
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
  };

  const handleSubmitDeliverable = async () => {
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
  };

  const handleReleaseMilestone = async () => {
    if (!selectedContract) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const signer = await getWeb3Signer();
      setSuccessMessage("Releasing cUSDC milestone payout and submitting rating...");
      await releaseEscrowMilestone(signer, selectedContract.address, ratingInput);
      
      setSuccessMessage("✔️ Milestone approved and released!");
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to release milestone.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRaiseDispute = async () => {
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
  };

  const logout = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (authenticated) {
        await privyLogout();
      }
    } catch (err) {
      console.warn("Disconnect error:", err);
    } finally {
      setWalletAddress(null);
      setVaultKey(null);
    }
  };

  const completedContracts = contractsList.filter(c => c.status === 'COMPLETED').length;
  const disputedContracts = contractsList.filter(c => c.status === 'DISPUTED').length;

  const activeEscrows = contractsList.filter(c => {
    if (viewMode === 'client') return c.role === 'CLIENT';
    return c.role === 'FREELANCER';
  });

  // --- Sleek Initialization Loader ---
  if (!ready) {
    return (
      <div className="bg-[#05070F] text-[#F1F5F9] min-h-screen flex items-center justify-center relative overflow-hidden font-sans cosmic-grid">
        <div className="fixed inset-0 z-0 pointer-events-none opacity-20 overflow-hidden">
          <div className="scanline"></div>
        </div>
        <div className="pulsing-aura top-[-10%] left-[-10%] z-0"></div>
        <div className="pulsing-aura bottom-[-10%] right-[-10%] z-0 animate-[auraPulse_10s_infinite_alternate_ease-in-out_-4s]"></div>
        <div className="flex flex-col items-center gap-4 relative z-10 animate-pulse">
          <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-[#00F2FE] animate-spin"></div>
          <span className="font-mono text-[10px] text-[#00F2FE] tracking-widest uppercase font-bold">Initializing Nox Gateway...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#05070F] text-[#F1F5F9] selection:bg-[#00F2FE]/20 selection:text-[#00F2FE] min-h-screen relative overflow-hidden font-sans cosmic-grid">
      {/* Background scanline & ambient effects */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="scanline"></div>
      </div>
      <div className="pulsing-aura top-[-10%] left-[-10%] z-0"></div>
      <div className="pulsing-aura bottom-[-10%] right-[-10%] z-0 animate-[auraPulse_10s_infinite_alternate_ease-in-out_-4s]"></div>

      {!walletAddress ? (
        <LandingPage 
          connectWallet={connectWallet} 
        />
      ) : !vaultKey ? (
        <KeyDerivationGate
          walletAddress={walletAddress}
          errorMessage={errorMessage}
          successMessage={successMessage}
          isUnsupportedNetwork={isUnsupportedNetwork}
          isDeriving={isDeriving}
          connectWallet={connectWallet}
          triggerKeyDerivation={triggerKeyDerivation}
        />
      ) : (
        <div className="flex flex-col min-h-screen md:pl-64 relative z-10 animate-fade-in">
          <Sidebar
            selectedContract={selectedContract}
            showDraftWizard={showDraftWizard}
            showSettings={showSettings}
            showTokenWrapper={showTokenWrapper}
            isAdmin={isAdmin}
            onSelectVaults={() => { setSelectedContract(null); setShowDraftWizard(false); setShowTokenWrapper(false); }}
            onSelectDeploy={() => { setShowDraftWizard(true); setShowTokenWrapper(false); }}
            onSelectWrapper={() => { setShowTokenWrapper(true); setShowDraftWizard(false); setSelectedContract(null); }}
            onToggleAdminConfig={() => setShowSettings(prev => !prev)}
            logout={logout}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />

          <Header
            walletAddress={walletAddress}
            pinataJWT={pinataJWT}
            supabaseUrl={supabaseUrl}
            supabaseKey={supabaseKey}
          />

          <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto flex flex-col gap-6 relative z-10">
            {/* Global notifications panel */}
            {(errorMessage || successMessage) && (
              <div className="space-y-2">
                {errorMessage && (
                  <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-[#FF1744] flex items-center gap-3 font-mono">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                {successMessage && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-xs text-[#00E676] flex items-center gap-3 font-mono">
                    <Unlock className="w-4 h-4 flex-shrink-0 animate-bounce" />
                    <span>{successMessage}</span>
                  </div>
                )}
              </div>
            )}

            {/* Asymmetric Bento Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Active Workspace Workspace area (8 columns) */}
              <div className="lg:col-span-8 flex flex-col gap-6 w-full">
                {showSettings && isAdmin && (
                  <div className="animate-fade-in">
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
                      onClose={() => setShowSettings(false)}
                    />
                  </div>
                )}

                {showTokenWrapper ? (
                  <div className="animate-fade-in">
                    <TokenWrapper
                      walletAddress={walletAddress!}
                      cUSDCAddress={cUSDCAddress}
                      publicUSDCAddress={publicUSDCAddress}
                      gatewayUrl={gatewayUrl}
                      getWeb3Signer={getWeb3Signer}
                    />
                  </div>
                ) : showDraftWizard ? (
                  <div className="animate-slide-up">
                    <DraftWizard
                      walletAddress={walletAddress}
                      draftFreelancer={draftFreelancer}
                      setDraftFreelancer={setDraftFreelancer}
                      draftTotalMilestones={draftTotalMilestones}
                      setDraftTotalMilestones={setDraftTotalMilestones}
                      draftMilestonePayouts={draftMilestonePayouts}
                      setDraftMilestonePayouts={setDraftMilestonePayouts}
                      draftMilestoneReqs={draftMilestoneReqs}
                      setDraftMilestoneReqs={setDraftMilestoneReqs}
                      isLoading={isLoading}
                      handleDeployEscrow={handleDeployEscrow}
                      onClose={() => setShowDraftWizard(false)}
                      draftFiles={draftFiles}
                      setDraftFiles={setDraftFiles}
                    />
                  </div>
                ) : selectedContract ? (
                  <div className="animate-fade-in">
                    <EscrowWorkspace
                      selectedContract={selectedContract}
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
                      onBack={() => setSelectedContract(null)}
                      deliverableFiles={deliverableFiles}
                      setDeliverableFiles={setDeliverableFiles}
                    />
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <PortfolioFeed
                      activeEscrows={activeEscrows}
                      isFetchingContracts={isFetchingContracts}
                      setSelectedContract={setSelectedContract}
                    />
                  </div>
                )}
              </div>

              {/* Right Global Telemetry Widgets area (4 columns) */}
              <div className="lg:col-span-4 flex flex-col gap-6 w-full">
                <ReputationGauge 
                  signer={signer}
                  reputationRegistryAddress={currentRegistry}
                  walletAddress={walletAddress}
                  gatewayUrl={gatewayUrl}
                  completedCount={completedContracts}
                  disputedCount={disputedContracts}
                />
                <EventLog />
              </div>
            </div>
          </main>

          <Footer
            setViewMode={setViewMode}
            setShowDraftWizard={setShowDraftWizard}
            logout={logout}
            setShowShortcutsHUD={setShowShortcutsHUD}
          />
        </div>
      )}

      {showShortcutsHUD && (
        <ShortcutsHUD onClose={() => setShowShortcutsHUD(false)} />
      )}

      <TransactionStepper
        isOpen={isStepperOpen}
        title={stepperTitle}
        steps={stepperSteps}
        subtext={stepperSubtext}
      />

      <ToastContainer
        toasts={toasts}
        onClose={removeToast}
      />
    </div>
  );
}

export default App;
