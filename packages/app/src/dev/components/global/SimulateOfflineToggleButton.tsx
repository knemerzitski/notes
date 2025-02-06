import { Button } from '@mui/material';
import { useState } from 'react';

import { GateController } from '../../../graphql/link/gate';
import { GraphQLServiceAction } from '../../../graphql/types';

const STORAGE_KEY = 'devToolsOnline';

class OnlineOverride {
  private overrideIsOnline: boolean | null;
  private eventIsOnline: boolean;

  get isOverride() {
    return this.overrideIsOnline != null;
  }
  constructor() {
    this.overrideIsOnline = null;
    this.eventIsOnline = window.navigator.onLine;
    if (!Object.getOwnPropertyDescriptor(window.navigator, 'onLine')) {
      Object.defineProperty(window.navigator, 'onLine', {
        get: () => this.overrideIsOnline ?? this.eventIsOnline,
      });
    }
    window.addEventListener('online', () => {
      this.eventIsOnline = true;
    });
    window.addEventListener('offline', () => {
      this.eventIsOnline = false;
    });
  }

  setOverrideOnline(online: boolean) {
    this.overrideIsOnline = online;
    if (online && !this.eventIsOnline) {
      window.dispatchEvent(new Event('online'));
    } else if (!online && this.isOverride) {
      window.dispatchEvent(new Event('offline'));
    }
  }

  clearOverrideOnline() {
    this.overrideIsOnline = null;
    if (this.eventIsOnline) {
      window.dispatchEvent(new Event('online'));
    } else if (!this.isOverride) {
      window.dispatchEvent(new Event('offline'));
    }
  }
}

let onlineOverride: OnlineOverride | undefined;
let offlineController: GateController | undefined;

export const simulateOfflineGraphQLServiceAction: GraphQLServiceAction = (service) => {
  offlineController = service.links.gateLink.create();
  onlineOverride = new OnlineOverride();
  if (readDevIsOnline() === false) {
    offlineController.close();
    onlineOverride.setOverrideOnline(false);
  }
};

function writeDevIsOnline(online: boolean) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(online));
}

function readDevIsOnline() {
  const value = localStorage.getItem(STORAGE_KEY);
  if (!value) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return JSON.parse(value);
}

export function SimulateOfflineToggleButton() {
  const [isOpen, setIsOpen] = useState(offlineController?.isOpen ?? false);
  const [isOverride, setIsOverride] = useState(onlineOverride?.isOverride ?? false);

  if (!offlineController) {
    return null;
  }

  function handleOpen() {
    if (!offlineController || !onlineOverride) return;

    setIsOpen(true);
    onlineOverride.setOverrideOnline(true);
    offlineController.open();
    writeDevIsOnline(true);

    setIsOverride(onlineOverride.isOverride);
  }

  function handleClose() {
    if (!offlineController || !onlineOverride) return;

    setIsOpen(false);
    onlineOverride.setOverrideOnline(false);
    offlineController.close();
    writeDevIsOnline(false);

    setIsOverride(onlineOverride.isOverride);
  }

  function handleClear() {
    if (!offlineController || !onlineOverride) return;

    onlineOverride.clearOverrideOnline();
    if (window.navigator.onLine) {
      setIsOpen(true);
      offlineController.open();
      writeDevIsOnline(true);
    } else {
      setIsOpen(false);
      offlineController.close();
      writeDevIsOnline(false);
    }

    setIsOverride(onlineOverride.isOverride);
  }

  return (
    <>
      <Button
        onClick={() => {
          if (isOpen) {
            handleClose();
          } else {
            handleOpen();
          }
        }}
      >
        {isOpen ? 'online' : 'offline'}
      </Button>
      {
        <Button
          disabled={!isOverride}
          onClick={() => {
            handleClear();
          }}
        >
          Clear
        </Button>
      }
    </>
  );
}
