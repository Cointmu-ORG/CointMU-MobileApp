import { router, useLocalSearchParams } from 'expo-router';

import { AccountMenu } from '@/features/manage-accounts';
import { ROUTES } from '@/shared/config';

import { SheetScreen } from './sheet-screen';

/** The menu of one account card. The route carries the wallet id and account index: public data. */
export function AccountMenuPage() {
  const { walletId, index } = useLocalSearchParams<{ walletId?: string; index?: string }>();
  const accountIndex = Number(index);
  if (walletId === undefined || !Number.isInteger(accountIndex)) return null;
  const params = { walletId, index: accountIndex };

  return (
    <SheetScreen>
      <AccountMenu
        account={params}
        onPersonalize={() => router.replace({ pathname: ROUTES.personalize, params })}
        onDefaultSet={() => router.back()}
        onReceive={() => router.replace({ pathname: ROUTES.receive, params })}
        onShowPrivateKey={() => router.replace({ pathname: ROUTES.privateKey, params })}
        onRemoveWallet={() =>
          router.replace({ pathname: ROUTES.removeWallet, params: { walletId } })
        }
      />
    </SheetScreen>
  );
}
