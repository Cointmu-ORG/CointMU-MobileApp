export type AccountRef = { readonly walletId: string; readonly index: number };

/** What the page does for each thing the grid can ask for. */
export type WalletGridActions = {
  onSelectAccount: (account: AccountRef) => void;
  onAccountMenu: (account: AccountRef) => void;
  onEditWallet: (walletId: string) => void;
  onResumeBackup: (walletId: string) => void;
  onRecoverWallet: (walletId: string) => void;
  onRemoveWallet: (walletId: string) => void;
  onAdd: () => void;
};
