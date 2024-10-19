import { ReactNode } from 'react';
import { SerialModalsProvider } from '../context/serial-modals';
import { SnackbarAlertProvider } from '../context/snackbar-alert';
import { ShowSnackbarMessageProvider } from './ShowSnackbarMessageProvider';
import { BlockUiProvider } from '../context/block-ui';
import { SnackbarUndoActionProvider } from './SnackbarUndoActionProvider';
import { GlobalCountProvider } from '../context/global-count';
import { Fab } from '@mui/material';

const GLOBAL_COUNT_IDS = [Fab];

export function AppUtilsModuleProvider({ children }: { children: ReactNode }) {
  return (
    <GlobalCountProvider ids={GLOBAL_COUNT_IDS}>
      <SerialModalsProvider>
        <SnackbarAlertProvider>
          <ShowSnackbarMessageProvider>
            <SnackbarUndoActionProvider>
              <BlockUiProvider>{children}</BlockUiProvider>
            </SnackbarUndoActionProvider>
          </ShowSnackbarMessageProvider>
        </SnackbarAlertProvider>
      </SerialModalsProvider>
    </GlobalCountProvider>
  );
}
