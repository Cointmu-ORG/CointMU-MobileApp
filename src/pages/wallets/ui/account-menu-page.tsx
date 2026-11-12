import { router, useLocalSearchParams } from 'expo-router';

import { AccountMenu } from '@/features/manage-accounts';
import { ROUTES } from '@/shared/config';

import { SheetScreen } from './sheet-screen';

/** The menu of one account card. The route carries the wallet id and account index: public data. */
export function AccountMenuPage() {
  const { walletId, index } = useLocalSearchParams<{ walletId?: string; index?: string }>();
  const accountIndex = Number(index);
  if (walletId === undefined || !Number.isInteger(accountIndex)) return null;

  return (
    <SheetScreen>
      <AccountMenu
        account={{ walletId, index: accountIndex }}
        onDone={() => router.back()}
        onChangeIcon={() =>
          router.replace({
            pathname: ROUTES.accountIcon,
            params: { walletId, index: accountIndex },
          })
        }
        onReceive={() =>
          router.replace({ pathname: ROUTES.receive, params: { walletId, index: accountIndex } })
        }
      />
    </SheetScreen>
  );
}
