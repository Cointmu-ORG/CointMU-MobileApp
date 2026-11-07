/** Expo Router hrefs. Route groups like (onboarding) do not appear in the URL. */
export const ROUTES = {
  welcome: '/welcome',
  create: '/create',
  import: '/import',
  backup: '/backup',
  verify: '/verify',
  setPin: '/set-pin',
  recover: '/recover',
  lock: '/lock',
  home: '/',
  send: '/send',
  sendReview: '/send/review',
  sendResult: '/send/result',
  receive: '/receive',
  scan: '/scan',
  network: '/network',
  accounts: '/accounts',
  changePin: '/change-pin',
  recoveryPhrase: '/recovery-phrase',
  removeWallet: '/remove-wallet',
  tokens: '/tokens',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
