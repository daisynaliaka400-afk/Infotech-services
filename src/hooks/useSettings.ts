import { useEffect, useState } from 'react';
import { getSettings } from '@/services/api';
import type { Settings } from '@/types/types';

let cachedSettings: Settings | null = null;

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(cachedSettings);
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    if (cachedSettings) return;
    getSettings()
      .then((s) => {
        cachedSettings = s;
        setSettings(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const refresh = async () => {
    setLoading(true);
    const s = await getSettings();
    cachedSettings = s;
    setSettings(s);
    setLoading(false);
  };

  return { settings, loading, refresh };
}
