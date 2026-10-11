'use client';

import { useEffect } from 'react';
import StateView from '@/components/StateView';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Surface for diagnostics without leaking details into the UI.
    console.error(error);
  }, [error]);

  return (
    <StateView
      kind="error"
      title="Something went wrong"
      message="An unexpected error occurred while rendering this page."
      actionLabel="Try again"
      onRetry={reset}
    />
  );
}
