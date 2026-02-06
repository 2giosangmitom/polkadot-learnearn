export const APP_NAME = 'LearnEarn';

export const POLKADOT_CONFIG = {
  NETWORK: 'paseo-asset-hub',
  RPC_ENDPOINT: process.env.NEXT_PUBLIC_POLKADOT_RPC ||   'wss://asset-hub-paseo-rpc.dwellir.com',
};

export const ROUTES = {
  HOME: '/',
  COURSES: '/courses',
  LEARN: '/learn',
  TEACHER: '/teacher',
  CREATE_COURSE: '/teacher/create',
} as const;

export const MIN_PASSING_SCORE = 70;

export const PAYMENT_CONFIG = {
  MIN_AMOUNT: 1,
  CURRENCY: 'PAS',
};
