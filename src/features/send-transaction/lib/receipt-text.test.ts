import { i18n } from '@/shared/i18n';

import { buildReceiptText, type ReceiptFacts } from './receipt-text';

const HASH = `0x${'ab'.repeat(32)}`;
const FACTS: ReceiptFacts = {
  amount: '1.5 CMU',
  to: 'Account 2 (0x7099…79C8)',
  date: '18 Nov 2026, 14:02',
  status: 'Confirmed',
  hash: HASH,
};

describe('buildReceiptText', () => {
  it('lists the amount, recipient, date, status and transaction id, one per line', async () => {
    await i18n.changeLanguage('en');
    const text = buildReceiptText(FACTS, i18n.t('send.receipt.shareTitle'), i18n.t);
    expect(text).toBe(
      [
        'Muvo transfer receipt',
        'Amount: 1.5 CMU',
        'To: Account 2 (0x7099…79C8)',
        'Date: 18 Nov 2026, 14:02',
        'Status: Confirmed',
        `Transaction ID: ${HASH}`,
      ].join('\n'),
    );
  });

  it('is translated', async () => {
    await i18n.changeLanguage('id');
    const text = buildReceiptText(FACTS, i18n.t('send.receipt.shareTitle'), i18n.t);
    expect(text.split('\n')[0]).toBe('Bukti transfer Muvo');
    expect(text).toContain('Jumlah: 1.5 CMU');
  });
});
