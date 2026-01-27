// learnearn-nextjs/lib/learningModules. ts

export interface Module {
  id: number;
  title: string;
  description: string;
  question: string;
  tuition: number; // learner pays this to the instructor
  reward: number; // sponsor reward returned to learner (WND)
  keywords: string[]; // For AI evaluation
}

export const MODULES:  Module[] = [
  {
    id: 1,
    title: 'Introduction to Polkadot',
    description: 'Learn about Polkadot blockchain architecture',
    question: 'What is Polkadot and what makes it unique among blockchains?',
    tuition: 0.02,
    reward: 0.01,
    keywords: ['parachain', 'relay chain', 'interoperability', 'cross-chain', 'substrate'],
  },
  {
    id: 2,
    title: 'SMOL402 Protocol',
    description: 'Understanding HTTP 402 Payment Required for Web3',
    question: 'How does the SMOL402 protocol enable autonomous payments in Web3?',
    tuition: 0.02,
    reward:  0.01,
    keywords: ['http 402', 'payment', 'autonomous', 'agent', 'blockchain'],
  },
  {
    id: 3,
    title: 'Substrate Framework',
    description: 'Building blockchains with Substrate',
    question: 'What is Substrate and how does it help developers build custom blockchains?',
    tuition: 0.02,
    reward: 0.01,
    keywords: ['substrate', 'framework', 'runtime', 'pallets', 'modular'],
  },
];

export function getModule(id: number): Module | undefined {
  return MODULES.find((m) => m.id === id);
}

export const TOTAL_MODULES = MODULES.length;
export const TOTAL_REWARDS = MODULES.reduce((sum, m) => sum + m.reward, 0);
export const TOTAL_TUITION = MODULES.reduce((sum, m) => sum + m.tuition, 0);