import { GateLink } from '../link/gate';

/**
 * Listens to window `online` and `offline` events and
 * adjusts global gate accordingly.
 * @returns Closure to remove event listeners
 */
export function createOnlineGate(link: Pick<GateLink, 'create'>) {
  const gate = link.create();

  function handleOnline() {
    gate.open();
  }

  function handleOffline() {
    gate.close();
  }

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  if (navigator.onLine) {
    handleOnline();
  } else {
    handleOffline();
  }

  function dispose() {
    gate.dispose();
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  }

  return dispose;
}
