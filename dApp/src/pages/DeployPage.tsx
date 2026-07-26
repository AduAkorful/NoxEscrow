import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { DraftWizard } from '../components/DraftWizard';

interface DeployPageProps {
  walletAddress: string | null;
  isLoading: boolean;
  viewMode: 'client' | 'freelancer';
  handleDeployEscrow: (
    draftFreelancer: string,
    draftTotalMilestones: number,
    draftMilestonePayouts: string,
    draftMilestoneReqs: string,
    draftFiles: File[],
    setDraftFiles: React.Dispatch<React.SetStateAction<File[]>>,
    setShowDraftWizard: (show: boolean) => void,
    draftTitle?: string
  ) => Promise<void>;
}

export function DeployPage({
  walletAddress,
  isLoading,
  viewMode,
  handleDeployEscrow
}: DeployPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [draftTitle, setDraftTitle] = useState("");
  const [draftFreelancer, setDraftFreelancer] = useState("");
  const [draftTotalMilestones, setDraftTotalMilestones] = useState(1);
  const [draftMilestonePayouts, setDraftMilestonePayouts] = useState<string>("");
  const [draftMilestoneReqs, setDraftMilestoneReqs] = useState<string>("");
  const [draftFiles, setDraftFiles] = useState<File[]>([]);

  useEffect(() => {
    const titleParam = searchParams.get('title');
    const flParam = searchParams.get('freelancer');
    const payoutsParam = searchParams.get('payouts');
    const reqsParam = searchParams.get('reqs');

    if (titleParam) setDraftTitle(titleParam);
    if (flParam) setDraftFreelancer(flParam);
    if (payoutsParam) setDraftMilestonePayouts(payoutsParam);
    if (reqsParam) setDraftMilestoneReqs(reqsParam);
    if (payoutsParam) {
      const count = payoutsParam.split(',').length;
      if (count > 0) setDraftTotalMilestones(count);
    }
  }, [searchParams]);

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
      },
      draftTitle
    );
  };

  return (
    <DraftWizard
      walletAddress={walletAddress}
      viewMode={viewMode}
      draftTitle={draftTitle}
      setDraftTitle={setDraftTitle}
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
