'use client';

import { useEffect } from 'react';
import { useSessionIntent } from '@/lib/session-intent';

// Fires a browse signal when a product page mounts. Renders nothing visible.
// productTags is passed as a prop from the server component so no catalog import is needed here.
export function ProductPageSignal({ productTags }: { productTags: string[] }) {
  const { addBrowseSignal } = useSessionIntent();
  useEffect(() => {
    addBrowseSignal(productTags);
  // addBrowseSignal is stable (useCallback []); productTags is read once at mount —
  // App Router unmounts on product nav so it never goes stale.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
