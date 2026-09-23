import type {
  ChainedEventLogEntry,
  IntegrityVerificationResult,
} from '@mobile-reality/mdma-runtime';
import { useCallback, useEffect, useState } from 'react';

export function useAudit() {
  const [entries, setEntries] = useState<ChainedEventLogEntry[]>([]);
  const [integrity, setIntegrity] = useState<IntegrityVerificationResult | null>(null);
  const [filePath, setFilePath] = useState('');

  const refresh = useCallback(async () => {
    const [nextEntries, nextIntegrity] = await Promise.all([
      window.mdma.audit.list(),
      window.mdma.audit.verify(),
    ]);
    setEntries(nextEntries);
    setIntegrity(nextIntegrity);
  }, []);

  useEffect(() => {
    void refresh();
    void window.mdma.audit.path().then(setFilePath);
    return window.mdma.audit.onChanged(() => {
      void refresh();
    });
  }, [refresh]);

  return { entries, integrity, filePath };
}
