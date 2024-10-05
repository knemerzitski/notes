import { useEffect } from 'react';
import { useIsOnline } from '../../utils/hooks/useIsOnline';
import { useQueueLink } from '../context/queue-link';

export function GateOnlineQueueLink() {
  const online = useIsOnline();
  const queueLink = useQueueLink();

  useEffect(() => {
    if (online) {
      queueLink.open();
    } else {
      queueLink.close();
    }
  }, [online, queueLink]);

  return null;
}
