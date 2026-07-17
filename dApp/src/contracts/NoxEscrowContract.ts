export const NoxEscrowContractABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AlreadySettled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AlreadySubmitted",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidArbiter",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidClient",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidFreelancer",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidInitialization",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMilestonesCount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidRating",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidReputationRegistry",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidState",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidToken",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LengthMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MutualCancellationNotRequested",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotInitializing",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReviewWindowExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReviewWindowNotExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Unauthorized",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "client",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "freelancer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalMilestones",
        "type": "uint256"
      }
    ],
    "name": "ContractInitialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "milestoneIndex",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "euint256",
        "name": "deliverableHash",
        "type": "bytes32"
      }
    ],
    "name": "DeliverableSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "milestoneIndex",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "euint256",
        "name": "requirementsHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "euint256",
        "name": "deliverableHash",
        "type": "bytes32"
      }
    ],
    "name": "DisputeOpened",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "milestoneIndex",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "ruledInFavorOfFreelancer",
        "type": "bool"
      }
    ],
    "name": "DisputeResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "version",
        "type": "uint64"
      }
    ],
    "name": "Initialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "milestoneIndex",
        "type": "uint256"
      }
    ],
    "name": "MilestoneApproved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "MutualCancellationExecuted",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "activeMilestoneIndex",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cUSDCToken",
    "outputs": [
      {
        "internalType": "contract IERC7984",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "client",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "clientCancelRequested",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "factory",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "freelancer",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "freelancerCancelRequested",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_client",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_freelancer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_teeArbiter",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_cUSDC",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_reputationRegistry",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_totalMilestones",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_reviewWindow",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_mutualCancelWindow",
        "type": "uint256"
      }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "externalEuint256[]",
        "name": "milestonePayouts",
        "type": "bytes32[]"
      },
      {
        "internalType": "bytes[]",
        "name": "payoutProofs",
        "type": "bytes[]"
      },
      {
        "internalType": "externalEuint256[]",
        "name": "milestoneReqs",
        "type": "bytes32[]"
      },
      {
        "internalType": "bytes[]",
        "name": "reqsProofs",
        "type": "bytes[]"
      }
    ],
    "name": "initializeEscrow",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "milestones",
    "outputs": [
      {
        "internalType": "euint256",
        "name": "requirementsHash",
        "type": "bytes32"
      },
      {
        "internalType": "euint256",
        "name": "deliverableHash",
        "type": "bytes32"
      },
      {
        "internalType": "euint256",
        "name": "payoutHandle",
        "type": "bytes32"
      },
      {
        "internalType": "uint128",
        "name": "submissionTime",
        "type": "uint128"
      },
      {
        "internalType": "bool",
        "name": "isSubmitted",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isSettled",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "mutualCancel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "mutualCancelWindow",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "raiseDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "rating",
        "type": "uint256"
      }
    ],
    "name": "releaseMilestone",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reputationRegistry",
    "outputs": [
      {
        "internalType": "contract INoxEscrowReputation",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bool",
        "name": "ruleInFavorOfFreelancer",
        "type": "bool"
      }
    ],
    "name": "resolveDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reviewWindow",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "status",
    "outputs": [
      {
        "internalType": "enum INoxEscrowContract.Status",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "externalEuint256",
        "name": "_deliverableHash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "proof",
        "type": "bytes"
      }
    ],
    "name": "submitDeliverable",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "teeArbiter",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalMilestones",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;