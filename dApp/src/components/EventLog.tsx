import { Terminal } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { NoxEscrowContractABI } from '../contracts/NoxEscrowContract';
import { NoxEscrowFactoryABI } from '../contracts/NoxEscrowFactory';

interface EventLogProps {
  signer: ethers.JsonRpcSigner | null;
  factoryAddress: string;
  contractsList: any[];
}

export function EventLog({ signer, factoryAddress, contractsList }: EventLogProps) {
  const [logs, setLogs] = useState<{ id: string; time: string; title: string; desc: string; type: 'success' | 'alert' | 'info' }[]>([]);

  useEffect(() => {
    // Basic fallback initialization to keep log clean
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fetchedLogs = [
      {
        id: 'heartbeat-init',
        time,
        title: 'SECURE_NODE_ONLINE',
        desc: 'TEE attestation monitoring session established.',
        type: 'info' as const
      }
    ];

    setLogs(fetchedLogs);

    if (!signer || !signer.provider) return;

    // 1. Setup factory event listener
    let factoryContract: ethers.Contract | null = null;
    if (factoryAddress) {
      try {
        factoryContract = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
        factoryContract.on('EscrowCreated', (escrowClone, _client, _freelancer, _totalMilestones, event) => {
          const evTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLogs(prev => [
            {
              id: `${event?.transactionHash || Math.random()}-${event?.logIndex || Math.random()}`,
              time: evTime,
              title: 'ESCROW_CLONE_CREATED',
              desc: `New contract deployed at ${escrowClone.slice(0, 6)}...${escrowClone.slice(-4)}`,
              type: 'info'
            },
            ...prev
          ]);
        });
      } catch (err) {
        console.error("Failed to listen to factory events:", err);
      }
    }

    // 2. Setup escrow contract listeners
    const activeContracts: ethers.Contract[] = [];
    contractsList.forEach(c => {
      if (!c.address) return;
      try {
        const contract = new ethers.Contract(c.address, NoxEscrowContractABI, signer);
        
        contract.on('ContractInitialized', (_client, _freelancer, _totalMilestones, event) => {
          const evTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLogs(prev => [
            {
              id: `${event?.transactionHash || Math.random()}-${event?.logIndex || Math.random()}`,
              time: evTime,
              title: 'CONTRACT_INITIALIZED',
              desc: `Escrow initialized: ${_totalMilestones} milestones locked.`,
              type: 'success'
            },
            ...prev
          ]);
        });

        contract.on('DeliverableSubmitted', (milestoneIndex, _deliverableHash, event) => {
          const evTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLogs(prev => [
            {
              id: `${event?.transactionHash || Math.random()}-${event?.logIndex || Math.random()}`,
              time: evTime,
              title: 'DELIVERABLE_SUBMITTED',
              desc: `Milestone ${Number(milestoneIndex) + 1} deliverable submitted.`,
              type: 'info'
            },
            ...prev
          ]);
        });

        contract.on('MilestoneApproved', (milestoneIndex, event) => {
          const evTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLogs(prev => [
            {
              id: `${event?.transactionHash || Math.random()}-${event?.logIndex || Math.random()}`,
              time: evTime,
              title: 'MILESTONE_APPROVED',
              desc: `Milestone ${Number(milestoneIndex) + 1} approved & payout released.`,
              type: 'success'
            },
            ...prev
          ]);
        });

        contract.on('DisputeOpened', (milestoneIndex, _requirementsHash, _deliverableHash, event) => {
          const evTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLogs(prev => [
            {
              id: `${event?.transactionHash || Math.random()}-${event?.logIndex || Math.random()}`,
              time: evTime,
              title: 'DISPUTE_OPENED',
              desc: `Dispute raised on Milestone ${Number(milestoneIndex) + 1}! TEE Arbiter alert.`,
              type: 'alert'
            },
            ...prev
          ]);
        });

        contract.on('DisputeResolved', (milestoneIndex, ruledInFavorOfFreelancer, event) => {
          const evTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLogs(prev => [
            {
              id: `${event?.transactionHash || Math.random()}-${event?.logIndex || Math.random()}`,
              time: evTime,
              title: 'DISPUTE_RESOLVED',
              desc: `Milestone ${Number(milestoneIndex) + 1} settled: Ruled in favor of ${ruledInFavorOfFreelancer ? 'Freelancer' : 'Client'}.`,
              type: 'success'
            },
            ...prev
          ]);
        });

        activeContracts.push(contract);
      } catch (err) {
        console.error(`Failed to attach event listeners for escrow ${c.address}:`, err);
      }
    });

    return () => {
      if (factoryContract) {
        try {
          factoryContract.removeAllListeners();
        } catch (e) {}
      }
      activeContracts.forEach(c => {
        try {
          c.removeAllListeners();
        } catch (e) {}
      });
    };
  }, [signer, contractsList, factoryAddress]);

  return (
    <div className="bento-card p-6 flex flex-col gap-4 hover:border-[#00F2FE]/30 transition-smooth">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00F2FE] animate-pulse drop-shadow-[0_0_5px_#00F2FE]"></span>
          <h4 className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold">SECURITY_EVENT_LOG</h4>
        </div>
        <Terminal className="w-3.5 h-3.5 text-slate-500" />
      </div>

      <div className="flex flex-col gap-2.5 custom-scrollbar max-h-[180px] overflow-y-auto pr-1">
        {logs.map((log) => {
          let borderClass = 'border-white/5';
          let titleClass = 'text-slate-300 font-medium';
          let bgClass = 'hover:bg-white/[0.01]';
          if (log.type === 'success') {
            borderClass = 'border-[#00E676]';
            titleClass = 'text-[#00E676] font-bold';
            bgClass = 'bg-[#00E676]/5';
          } else if (log.type === 'alert') {
            borderClass = 'border-[#FF1744]';
            titleClass = 'text-[#FF1744] font-bold animate-pulse';
            bgClass = 'bg-[#FF1744]/5';
          } else if (log.type === 'info') {
            borderClass = 'border-[#00F2FE]';
            titleClass = 'text-[#00F2FE] font-bold';
            bgClass = 'bg-[#00F2FE]/5';
          }

          return (
            <div key={log.id} className={`flex flex-col gap-1 text-[10px] font-mono border-l-2 ${borderClass} pl-3 py-1 ${bgClass} rounded-r-lg transition-smooth`}>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">{log.time}</span>
                <span className={titleClass}>{log.title}</span>
              </div>
              <span className="text-[9px] text-slate-400 pl-0">{log.desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
