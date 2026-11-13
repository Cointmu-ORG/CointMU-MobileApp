import { useCallback, useEffect, useState } from 'react';

import { classifySendError, isQuoteStale, type SendErrorCode } from '@/entities/transaction';
import { logger } from '@/shared/lib';

import { FEE_QUOTE_MAX_AGE_MS } from '../config/send-config';
import { quoteSend } from '../model/prepare-send';
import { useSendFlowStore, type SendDraft } from '../model/send-flow-store';

/**
 * Keeps the draft's fee current: refetched when the review screen opens, and again right
 * before signing if it is older than FEE_QUOTE_MAX_AGE_MS. Returns the fresh draft or null.
 */
type Requote = { readonly draft: SendDraft | null; readonly error: SendErrorCode | null };

/** Fetches a new quote for the stored draft and saves it. Never throws. */
async function requote(): Promise<Requote> {
  const current = useSendFlowStore.getState().draft;
  if (current === null) return { draft: null, error: null };
  try {
    const quote = await quoteSend({ ...current, from: current.from.address });
    const next = { ...current, quote };
    useSendFlowStore.getState().setDraft(next);
    return { draft: next, error: null };
  } catch (caught) {
    logger.warn('Refreshing the fee failed', { error: caught });
    return { draft: null, error: classifySendError(caught) };
  }
}

export function useFreshQuote() {
  const draft = useSendFlowStore((state) => state.draft);
  // Starts true: the screen refetches the fee as soon as it opens.
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [error, setError] = useState<SendErrorCode | null>(null);

  const apply = useCallback((result: Requote) => {
    setError(result.error);
    setIsRefreshing(false);
    return result.draft;
  }, []);

  useEffect(() => {
    void requote().then(apply);
  }, [apply]);

  const ensureFresh = useCallback(async () => {
    const current = useSendFlowStore.getState().draft;
    if (current === null) return null;
    if (!isQuoteStale(current.quote, Date.now(), FEE_QUOTE_MAX_AGE_MS)) return current;
    setIsRefreshing(true);
    return apply(await requote());
  }, [apply]);

  return { draft, isRefreshing, error, ensureFresh };
}
