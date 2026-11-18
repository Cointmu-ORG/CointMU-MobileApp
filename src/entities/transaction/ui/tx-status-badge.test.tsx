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
    pending: 'Sending',
    confirmed: 'Confirmed',
    final: 'Completed',
    failed: 'Failed',
    dropped: "Didn't go through",
    replaced: 'Replaced',
  },
  id: {
    pending: 'Sedang dikirim',
    confirmed: 'Terkonfirmasi',
    final: 'Selesai',
    failed: 'Gagal',
    dropped: 'Tidak terkirim',
    replaced: 'Diganti',
  },
};

describe('TxStatusBadge', () => {
  it.each(['en', 'id'])(
    'has plain words, without a block count, for every status in %s',
    async (language) => {
      await i18n.changeLanguage(language);
      for (const status of STATUSES) {
        await render(<TxStatusBadge status={status} />);
        expect(screen.getByLabelText(EXPECTED[language]?.[status] ?? '')).toBeOnTheScreen();
      }
    },
  );
});
