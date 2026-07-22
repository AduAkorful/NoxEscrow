import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { deriveEncryptionKey, SIGN_MESSAGE } from './crypto/keyDerivation';
import { 
  DEFAULT_NOX_GATEWAY
} from './services/escrowService';
import { 
  AlertTriangle,
  Unlock
} from 'lucide-react';
import { ethers } from 'ethers';
import addresses from './contracts/addresses.json';
import { usePrivy, useWallets } from '@privy-io/react-auth';

// Sub-components
import { LandingPage } from './components/LandingPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
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
import { MarketplacePage } from './pages/MarketplacePage';
import { ProfilePage } from './pages/ProfilePage';

function App() {
  // --- Privy Hooks ---
  const { logout: privyLogout, login: loginPrivy, authenticated, user } = usePrivy();
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
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  // --- Toast notifications state ---
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToasts(prev => [...prev, { id: Math.random().toString(), message, type }]);
  }, []);
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  // --- Global Keyboard Shortcuts Listener (Cmd+K / ?) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowShortcutsHUD(prev => !prev);
      }
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setShowShortcutsHUD(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    handleRaiseDispute,
    handleMutualCancel
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
    } else {
      setWalletAddress(null);
      setVaultKey(null);
    }
  }, [authenticated, connectedAddress]);

  // Network Verification Check
  const checkNetwork = useCallback(async () => {
    try {
      const s = await getWeb3Signer();
      setSigner(s);
      const network = await s.provider.getNetwork();
      const chainIdNumber = Number(network.chainId);
      
      const isLocalhost = chainIdNumber === 31337 || chainIdNumber === 1337;
      const isSepolia = chainIdNumber === 11155111;
      
      if (!isLocalhost && !isSepolia) {
        setErrorMessage(`Connected to chain ID ${chainIdNumber}. Please switch your Web3 wallet network to Sepolia Testnet or Localhost 31337.`);
      }
    } catch (e: any) {
      console.warn("Network check error:", e);
    }
  }, [getWeb3Signer]);

  // Auto-fetch data on wallet connect (without blocking UI with KeyDerivationGate)
  useEffect(() => {
    if (walletAddress) {
      checkNetwork();
      loadOnChainContracts();
      checkAdminStatus();
      loadFactoryParams();
    }
  }, [walletAddress, checkNetwork, loadOnChainContracts, checkAdminStatus, loadFactoryParams]);

  // Derived Key check
  const triggerKeyDerivation = useCallback(async (): Promise<string> => {
    if (!walletAddress) throw new Error("Wallet not connected");
    setIsDeriving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const s = await getWeb3Signer();
      setSigner(s);
      const signature = await s.signMessage(SIGN_MESSAGE);
      const key = await deriveEncryptionKey(signature);
      setVaultKey(key);
      setSuccessMessage("🔐 Cryptographic key successfully derived! Environment unlocked.");
      
      loadOnChainContracts();
      checkAdminStatus();
      loadFactoryParams();
      return key;
    } catch (err: any) {
      console.error("Key derivation failed:", err);
      setErrorMessage("Failed to derive vault key. Please sign the authentication request in your Web3 wallet.");
      throw err;
    } finally {
      setIsDeriving(false);
    }
  }, [walletAddress, getWeb3Signer, loadOnChainContracts, checkAdminStatus, loadFactoryParams]);

  // Just-in-time key requirement wrapper for transactional operations
  const withKeyRequirement = <T extends (...args: any[]) => Promise<any>>(actionFn: T): T => {
    return (async (...args: Parameters<T>) => {
      if (!vaultKey) {
        try {
          await triggerKeyDerivation();
        } catch (e) {
          return;
        }
      }
      return actionFn(...args);
    }) as T;
  };

  const connectWallet = async () => {
    setErrorMessage(null);
    try {
      if (!authenticated) {
        loginPrivy();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to establish Web3 wallet connection.");
    }
  };

  const logout = async () => {
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

  const activeEscrows = contractsList.filter(c => {
    if (viewMode === 'client') return c.role === 'CLIENT';
    return c.role === 'FREELANCER';
  });



  const activeTab = (location.pathname === '/' || location.pathname === '/home')
    ? 'home' 
    : location.pathname.startsWith('/marketplace')
      ? 'marketplace'
      : location.pathname.startsWith('/profile')
        ? 'profile'
        : location.pathname.startsWith('/swap') 
          ? 'swap' 
          : location.pathname.startsWith('/deploy') 
            ? 'deploy' 
            : location.pathname.startsWith('/admin') 
              ? 'admin' 
              : 'vaults';

  return (
    <div className="bg-[#0B0E17] text-[#F8FAFC] selection:bg-[#38BDF8]/20 selection:text-[#38BDF8] min-h-screen relative overflow-hidden font-sans">
      {/* Uniswap / ReactBits Ambient Glowing Background Orbs */}
      <div className="ambient-orb-1"></div>
      <div className="ambient-orb-2"></div>
      <div className="ambient-orb-3"></div>

      <div className="flex flex-col min-h-screen relative z-10 animate-fade-in pb-16 md:pb-0">
        <Header
          walletAddress={walletAddress}
          pinataJWT={pinataJWT}
          supabaseUrl={supabaseUrl}
          supabaseKey={supabaseKey}
          activeTab={activeTab}
          isAdmin={isAdmin}
          onSelectHome={() => navigate('/')}
          onSelectVaults={() => navigate('/vaults')}
          onSelectDeploy={() => navigate('/deploy')}
          onSelectWrapper={() => navigate('/swap')}
          onSelectMarketplace={() => navigate('/marketplace')}
          onSelectProfile={() => navigate('/profile')}
          onToggleAdminConfig={() => navigate(activeTab === 'admin' ? '/vaults' : '/admin')}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onLogin={loginPrivy}
          onLogout={logout}
          vaultKey={vaultKey}
          onDeriveKey={triggerKeyDerivation}
          isDerivingKey={isDeriving}
        />

        <Sidebar
          activeTab={activeTab}
          isAdmin={isAdmin}
          onSelectVaults={() => navigate('/vaults')}
          onSelectDeploy={() => navigate('/deploy')}
          onSelectWrapper={() => navigate('/swap')}
          onSelectMarketplace={() => navigate('/marketplace')}
          onSelectProfile={() => navigate('/profile')}
          onToggleAdminConfig={() => navigate(activeTab === 'admin' ? '/vaults' : '/admin')}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        <main className="flex-1 px-4 sm:px-6 py-8 max-w-7xl w-full mx-auto relative z-10">
          {/* Global notifications panel */}
          {(errorMessage || successMessage) && (
            <div className="space-y-2 mb-6">
              {errorMessage && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center gap-3">
                  <Unlock className="w-4 h-4 flex-shrink-0 text-emerald-400 animate-bounce" />
                  <span>{successMessage}</span>
                </div>
              )}
            </div>
          )}

          <Routes>
            <Route path="/" element={
              <LandingPage 
                connectWallet={connectWallet} 
                walletAddress={walletAddress} 
                onLaunchApp={() => navigate('/vaults')} 
              />
            } />
            <Route path="/marketplace" element={
              <MarketplacePage 
                walletAddress={walletAddress} 
                onHireFreelancer={(freelancerAddr) => navigate(`/deploy?freelancer=${freelancerAddr}`)} 
              />
            } />
            <Route path="/profile" element={
              <ProfilePage 
                walletAddress={walletAddress} 
                onHireFreelancer={(freelancerAddr) => navigate(`/deploy?freelancer=${freelancerAddr}`)} 
              />
            } />
            <Route path="/vaults" element={
              <VaultsPage 
                activeEscrows={activeEscrows} 
                isFetchingContracts={isFetchingContracts} 
                viewMode={viewMode}
              />
            } />
            <Route path="/deploy" element={
              <DeployPage 
                walletAddress={walletAddress} 
                isLoading={isLoading} 
                handleDeployEscrow={withKeyRequirement(handleDeployEscrow)} 
              />
            } />
            <Route path="/swap" element={
              <SwapPage 
                walletAddress={walletAddress} 
                cUSDCAddress={cUSDCAddress} 
                publicUSDCAddress={publicUSDCAddress} 
                gatewayUrl={gatewayUrl} 
                getWeb3Signer={getWeb3Signer}
                signer={signer}
                reputationRegistryAddress={currentRegistry}
                factoryAddress={factoryAddress}
                contractsList={contractsList}
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
                handleUpdateImplementation={withKeyRequirement(handleUpdateImplementation)}
                handleUpdateRegistry={withKeyRequirement(handleUpdateRegistry)}
                handleUpdateUSDCToken={withKeyRequirement(handleUpdateUSDCToken)}
                handleUpdateReviewWindow={withKeyRequirement(handleUpdateReviewWindow)}
                handleUpdateMutualCancelWindow={withKeyRequirement(handleUpdateMutualCancelWindow)}
                handleUpdateTeeArbiter={withKeyRequirement(handleUpdateTeeArbiter)}
                handleUpdatePlatformFeeBps={withKeyRequirement(handleUpdatePlatformFeeBps)}
                handleUpdateTreasury={withKeyRequirement(handleUpdateTreasury)}
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
                handleRaiseDispute={withKeyRequirement(handleRaiseDispute)}
                handleSubmitDeliverable={withKeyRequirement(handleSubmitDeliverable)}
                handleReleaseMilestone={withKeyRequirement(handleReleaseMilestone)}
                handleMutualCancel={withKeyRequirement(handleMutualCancel)}
                deliverableFiles={deliverableFiles}
                setDeliverableFiles={setDeliverableFiles}
              />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
