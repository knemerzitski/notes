import { useEffect, useState } from 'react';

export function useIsOnline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function setOnline() {
      setIsOnline(true);
    }

    window.addEventListener('online', setOnline);

    return () => {
      window.removeEventListener('online', setOnline);
    };
  }, []);

  useEffect(() => {
    function setOffline() {
      setIsOnline(false);
    }

    window.addEventListener('offline', setOffline);

    return () => {
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  return isOnline;
}
