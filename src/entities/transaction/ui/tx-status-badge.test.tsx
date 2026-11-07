import { render, screen } from '@testing-library/react-native';

import { i18n } from '@/shared/i18n';

import type { TxStatus } from '../model/types';
import { TxStatusBadge } from './tx-status-badge';

const STATUSES: readonly TxStatus[] = [
  'pending',
  'confirmed',
  'final',
  'failed',
  'dropped',
  'replaced',
];
const EXPECTED: Record<string, Record<TxStatus, string>> = {
  en: {
    pending: 'Pending',
    confirmed: 'Confirmed 3/12',
    final: 'Final',
    failed: 'Failed',
    dropped: 'Dropped',
    replaced: 'Replaced',
  },
  id: {
    pending: 'Tertunda',
    confirmed: 'Terkonfirmasi 3/12',
    final: 'Final',
    failed: 'Gagal',
    dropped: 'Dibatalkan jaringan',
    replaced: 'Digantikan',
  },
};
const CONFIRMATIONS = 3;

describe('TxStatusBadge', () => {
  it.each(['en', 'id'])('has copy for every status in %s', async (language) => {
    await i18n.changeLanguage(language);
    for (const status of STATUSES) {
      await render(<TxStatusBadge status={status} confirmations={CONFIRMATIONS} />);
      expect(screen.getByLabelText(EXPECTED[language]?.[status] ?? '')).toBeOnTheScreen();
    }
  });
});
