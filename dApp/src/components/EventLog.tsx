import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
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
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fetchedLogs = [
      {
        id: 'heartbeat-init',
        time,
        title: 'Secure Node Active',
        desc: 'TEE attestation monitoring session established.',
        type: 'info' as const
      }
    ];

    setLogs(fetchedLogs);

    if (!signer || !signer.provider) return;

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
              title: 'Escrow Deployed',
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
              title: 'Contract Initialized',
              desc: `Escrow initialized with ${_totalMilestones} milestones.`,
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
              title: 'Deliverable Submitted',
              desc: `Milestone ${Number(milestoneIndex) + 1} deliverable uploaded.`,
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
              title: 'Milestone Released',
              desc: `Milestone ${Number(milestoneIndex) + 1} payout approved & sent.`,
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
              title: 'Dispute Raised',
              desc: `Dispute opened on Milestone ${Number(milestoneIndex) + 1}.`,
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
              title: 'Dispute Resolved',
              desc: `Settled: Ruled in favor of ${ruledInFavorOfFreelancer ? 'Freelancer' : 'Client'} for Milestone ${Number(milestoneIndex) + 1}.`,
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
    <div className="uniswap-card p-6 flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#38BDF8]" />
          <h4 className="font-bold text-white text-base">Security Activity Stream</h4>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      </div>

      <div className="flex flex-col gap-2.5 custom-scrollbar max-h-[220px] overflow-y-auto pr-1">
        {logs.map((log) => {
          let dotColor = 'bg-[#38BDF8]';
          let textColor = 'text-[#38BDF8]';
          if (log.type === 'success') {
            dotColor = 'bg-emerald-400';
            textColor = 'text-emerald-400';
          } else if (log.type === 'alert') {
            dotColor = 'bg-rose-400';
            textColor = 'text-rose-400';
          }

          return (
            <div key={log.id} className="p-3 bg-[#131826]/60 border border-white/[0.06] rounded-2xl flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                  <span className={`font-semibold ${textColor}`}>{log.title}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{log.time}</span>
              </div>
              <p className="text-slate-400 text-xs pl-4 leading-relaxed">{log.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
