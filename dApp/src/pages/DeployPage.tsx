import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { DraftWizard } from '../components/DraftWizard';

interface DeployPageProps {
  walletAddress: string | null;
  isLoading: boolean;
  handleDeployEscrow: (
    draftFreelancer: string,
    draftTotalMilestones: number,
    draftMilestonePayouts: string,
    draftMilestoneReqs: string,
    draftFiles: File[],
    setDraftFiles: React.Dispatch<React.SetStateAction<File[]>>,
    setShowDraftWizard: (show: boolean) => void
  ) => Promise<void>;
}

export function DeployPage({
  walletAddress,
  isLoading,
  handleDeployEscrow
}: DeployPageProps) {
  const navigate = useNavigate();

  // Keep these form states in the page component, as they are specific to the deployment wizard
  const [draftFreelancer, setDraftFreelancer] = useState("");
  const [draftTotalMilestones, setDraftTotalMilestones] = useState(1);
  const [draftMilestonePayouts, setDraftMilestonePayouts] = useState<string>("1000");
  const [draftMilestoneReqs, setDraftMilestoneReqs] = useState<string>("Build a responsive collapsible sidebar using React.");
  const [draftFiles, setDraftFiles] = useState<File[]>([]);

  const onDeploy = async () => {
    await handleDeployEscrow(
      draftFreelancer,
      draftTotalMilestones,
      draftMilestonePayouts,
      draftMilestoneReqs,
      draftFiles,
      setDraftFiles,
      (show) => {
        if (!show) {
          navigate('/vaults');
        }
      }
    );
  };

  return (
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
      handleDeployEscrow={onDeploy}
      onClose={() => navigate('/vaults')}
      draftFiles={draftFiles}
      setDraftFiles={setDraftFiles}
    />
  );
}
export default DeployPage;
