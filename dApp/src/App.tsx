import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { deriveEncryptionKey, SIGN_MESSAGE } from './crypto/keyDerivation';
import { 
  DEFAULT_NOX_GATEWAY
} from './services/escrowService';
import { 
  updateEscrowStatement, 
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
import { usePrivy, useWallets } from '@privy-io/react-auth';

// Sub-components
import { LandingPage } from './components/LandingPage';
import { KeyDerivationGate } from './components/KeyDerivationGate';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ReputationGauge } from './components/ReputationGauge';
import { EventLog } from './components/EventLog';
import { ShortcutsHUD } from './components/ShortcutsHUD';
import { Footer } from './components/Footer';
import { TransactionStepper } from './components/TransactionStepper';
import { ToastContainer } from './components/ToastContainer';
import type { Toast } from './components/ToastContainer';

// Custom Hooks
import { useEscrowActions } from './hooks/useEscrowActions';
import { useAdminConfig } from './hooks/useAdminConfig';

// Pages
import { VaultsPage } from './pages/VaultsPage';
import { EscrowPage } from './pages/EscrowPage';
import { DeployPage } from './pages/DeployPage';
import { SwapPage } from './pages/SwapPage';
import { AdminPage } from './pages/AdminPage';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUnsupportedNetwork, setIsUnsupportedNetwork] = useState(false);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  // --- Toast notifications state ---
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToasts(prev => [...prev, { id: Math.random().toString(), message, type }]);
  }, []);
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // --- API & E2E Config Constants from Env ---
  const pinataJWT = import.meta.env.VITE_PINATA_JWT || "";
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || "";

  // --- Contract Deployment Config Constants from Env/addresses.json ---
  const factoryAddress = import.meta.env.VITE_NOX_ESCROW_FACTORY || addresses.factory || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const cUSDCAddress = import.meta.env.VITE_CUSDC_TOKEN || addresses.cUSDC || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || addresses.gatewayUrl || DEFAULT_NOX_GATEWAY;
  const publicUSDCAddress = import.meta.env.VITE_PUBLIC_USDC_TOKEN || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  // --- Router Navigation and Location Hooks ---
  const location = useLocation();
  const navigate = useNavigate();

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

  // --- Initialize Custom Hooks ---
  const {
    contractsList,
    isFetchingContracts,
    deliverableInput,
    setDeliverableInput,
    deliverableFiles,
    setDeliverableFiles,
    disputeStatement,
    setDisputeStatement,
    ratingInput,
    setRatingInput,
    isLoading: isEscrowLoading,
    
    // Stepper State
    isStepperOpen,
    stepperTitle,
    stepperSteps,
    stepperSubtext,

    // Methods
    loadOnChainContracts,
    handleDeployEscrow,
    handleSubmitDeliverable,
    handleReleaseMilestone,
    handleRaiseDispute
  } = useEscrowActions({
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
  });

  const {
    isAdmin,
    isLoading: isAdminLoading,
    
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
  } = useAdminConfig({
    walletAddress,
    factoryAddress,
    cUSDCAddress,
    getWeb3Signer,
    setErrorMessage,
    setSuccessMessage
  });

  const isLoading = isEscrowLoading || isAdminLoading;

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

  // --- Actions ---
  const connectWallet = useCallback(async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUnsupportedNetwork(false);

    try {
      await loginPrivy();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to connect wallet via Privy.');
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
      setErrorMessage(err instanceof Error ? err.message : 'Key derivation failed.');
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
        navigate('/vaults');
      } else if (key === 'escape') {
        e.preventDefault();
        setShowShortcutsHUD(false);
        navigate('/vaults');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [walletAddress, vaultKey, connectWallet, triggerKeyDerivation, navigate]);

  // --- Dynamic On-Chain Contract & Admin Fetching ---
  useEffect(() => {
    if (vaultKey && walletAddress) {
      loadOnChainContracts();
      checkAdminStatus();
      loadFactoryParams();
    }
  }, [vaultKey, walletAddress, loadOnChainContracts, checkAdminStatus, loadFactoryParams]);

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

  // --- Computed Sidebar State ---
  const isEscrowRoute = location.pathname.startsWith('/escrow/');
  const currentEscrowAddress = isEscrowRoute ? location.pathname.split('/').pop() : null;
  const sidebarSelectedContract = isEscrowRoute 
    ? (contractsList.find(c => c.address.toLowerCase() === currentEscrowAddress?.toLowerCase()) || ({} as any))
    : null;

  const showDraftWizard = location.pathname === '/deploy';
  const showTokenWrapper = location.pathname === '/swap';
  const showSettings = location.pathname === '/admin';

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
            selectedContract={sidebarSelectedContract}
            showDraftWizard={showDraftWizard}
            showSettings={showSettings}
            showTokenWrapper={showTokenWrapper}
            isAdmin={isAdmin}
            onSelectVaults={() => navigate('/vaults')}
            onSelectDeploy={() => navigate('/deploy')}
            onSelectWrapper={() => navigate('/swap')}
            onToggleAdminConfig={() => navigate(showSettings ? '/vaults' : '/admin')}
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

          <main className="flex-1 p-6 pb-24 md:pb-6 max-w-[1400px] w-full mx-auto flex flex-col gap-6 relative z-10">
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
                <Routes>
                  <Route path="/" element={<Navigate to="/vaults" replace />} />
                  <Route path="/vaults" element={
                    <VaultsPage 
                      activeEscrows={activeEscrows} 
                      isFetchingContracts={isFetchingContracts} 
                    />
                  } />
                  <Route path="/deploy" element={
                    <DeployPage 
                      walletAddress={walletAddress} 
                      isLoading={isLoading} 
                      handleDeployEscrow={handleDeployEscrow} 
                    />
                  } />
                  <Route path="/swap" element={
                    <SwapPage 
                      walletAddress={walletAddress} 
                      cUSDCAddress={cUSDCAddress} 
                      publicUSDCAddress={publicUSDCAddress} 
                      gatewayUrl={gatewayUrl} 
                      getWeb3Signer={getWeb3Signer} 
                    />
                  } />
                  <Route path="/admin" element={
                    <AdminPage
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
                      isAdmin={isAdmin}
                    />
                  } />
                  <Route path="/escrow/:address" element={
                    <EscrowPage
                      contractsList={contractsList}
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
                      deliverableFiles={deliverableFiles}
                      setDeliverableFiles={setDeliverableFiles}
                    />
                  } />
                  <Route path="*" element={<Navigate to="/vaults" replace />} />
                </Routes>
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
                <EventLog 
                  signer={signer}
                  factoryAddress={factoryAddress}
                  contractsList={contractsList}
                />
              </div>
            </div>
          </main>

          <Footer
            setViewMode={setViewMode}
            setShowDraftWizard={(val) => {
              if (val) navigate('/deploy');
            }}
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
