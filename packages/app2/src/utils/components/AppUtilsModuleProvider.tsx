import { ReactNode } from 'react';
import { SerialModalsProvider } from '../context/serial-modals';
import { SnackbarAlertProvider } from '../context/snackbar-alert';
import { ShowErrorTopSnackbarProvider } from './ShowErrorTopSnackbarProvider';
import { BlockUiProvider } from '../context/block-ui';
import { GraphQLErrorsShowSnackBar } from './GraphQLErrorsShowSnackBar';
import { SnackbarUndoActionProvider } from './SnackbarUndoActionProvider';
import { GlobalCountProvider } from '../context/global-count';
import { Fab } from '@mui/material';

const GLOBAL_COUNT_IDS = [Fab];

export function AppUtilsModuleProvider({ children }: { children: ReactNode }) {
  return (
    <GlobalCountProvider ids={GLOBAL_COUNT_IDS}>
      <SerialModalsProvider>
        <SnackbarAlertProvider>
          <ShowErrorTopSnackbarProvider>
            <GraphQLErrorsShowSnackBar />
            <SnackbarUndoActionProvider>
              <BlockUiProvider>{children}</BlockUiProvider>
            </SnackbarUndoActionProvider>
          </ShowErrorTopSnackbarProvider>
        </SnackbarAlertProvider>
      </SerialModalsProvider>
    </GlobalCountProvider>
  );
}
