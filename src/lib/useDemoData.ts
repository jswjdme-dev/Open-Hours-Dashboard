import { useState, useEffect } from 'react';
import { isDemoDataActive } from '../data/repo.ts';

export function useIsDemoData(): boolean {
  const [active, setActive] = useState(() => isDemoDataActive());

  useEffect(() => {
    const handleUpdate = () => {
      setActive(isDemoDataActive());
    };
    window.addEventListener('demoDataStateChanged', handleUpdate);
    return () => window.removeEventListener('demoDataStateChanged', handleUpdate);
  }, []);

  return active;
}
