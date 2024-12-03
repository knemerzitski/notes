import { Fab } from '@mui/material';
import { ReactNode } from 'react';

import { BlockUiProvider } from '../context/block-ui';
import { GlobalCountProvider } from '../context/global-count';
import { SerialModalsProvider } from '../context/serial-modals';
import { SnackbarAlertProvider } from '../context/snackbar-alert';

import { ShowConfirmDialogProvider } from './ShowConfirmDialogProvider';
import { ShowSnackbarMessageProvider } from './ShowSnackbarMessageProvider';
import { SnackbarUndoActionProvider } from './SnackbarUndoActionProvider';



const GLOBAL_COUNT_IDS = [Fab];

export function AppUtilsModuleProvider({ children }: { children: ReactNode }) {
  return (
    <GlobalCountProvider ids={GLOBAL_COUNT_IDS}>
      <SerialModalsProvider>
        <SnackbarAlertProvider>
          <ShowSnackbarMessageProvider>
            <SnackbarUndoActionProvider>
              <ShowConfirmDialogProvider>
                <BlockUiProvider>{children}</BlockUiProvider>
              </ShowConfirmDialogProvider>
            </SnackbarUndoActionProvider>
          </ShowSnackbarMessageProvider>
        </SnackbarAlertProvider>
      </SerialModalsProvider>
    </GlobalCountProvider>
  );
}
