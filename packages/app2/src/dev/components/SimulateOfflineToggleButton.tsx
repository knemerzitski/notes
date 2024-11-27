import { Button } from '@mui/material';
import { useState } from 'react';
import { GraphQLServiceAction } from '../../graphql/types';
import { GateController } from '../../graphql/link/gate';

const STORAGE_KEY = 'devToolsOnline';

let offlineController: GateController | undefined;

export const simulateOfflineGraphQLServiceAction: GraphQLServiceAction = (service) => {
  offlineController = service.links.gateLink.create();
  if (readDevIsOnline() === false) {
    offlineController.close();
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
  return JSON.parse(value);
}

export function SimulateOfflineToggleButton() {
  const [isOpen, setIsOpen] = useState(offlineController?.isOpen ?? false);

  if (!offlineController) {
    return null;
  }

  function handleOpen() {
    if (!offlineController) return;

    setIsOpen(true);
    offlineController.open();
    writeDevIsOnline(true);
  }

  function handleClose() {
    if (!offlineController) return;

    setIsOpen(false);
    offlineController.close();
    writeDevIsOnline(false);
  }

  return (
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
  );
}
