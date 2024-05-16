import { CssBaseline } from '@mui/material';
import GlobalStyles from './GlobalStyles';
import themeOptions from './themeOptions';
import { customApolloClient } from './modules/apollo-client/apollo-client';
import ApolloClientErrorsSnackbarAlert from './modules/apollo-client/components/ApolloClientErrorsSnackbarAlert';
import ApolloClientSynchronized from './modules/apollo-client/components/ApolloClientSynchronized';
import CustomApolloClientProvider from './modules/apollo-client/context/CustomApolloClientProvider';
import GoogleAuthProvider from './modules/auth/third-party/google/GoogleAuthProvider';
import ActiveCollabTextsManager from './modules/collab/components/ActiveCollabTextsManager';
import SnackbarAlertProvider from './modules/common/components/SnackbarAlertProvider';
import ActiveNotesManager from './modules/note/components/ActiveNotesManager';
import ExternalChangesSubscription from './modules/note/components/ExternalChangesSubscription';
import NoteCreatedSubscription from './modules/note/components/NoteCreatedSubscription';
import NoteDeletedSubscription from './modules/note/components/NoteDeletedSubscription';
import CustomThemeProvider from './modules/theme/context/CustomThemeProvider';
import { router } from './modules/routes/RoutesStructure';
import RouterProvider from './modules/router/context/RouterProvider';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function App() {
  return (
    <CustomApolloClientProvider client={customApolloClient}>
      <ApolloClientSynchronized />
      <CustomThemeProvider themeOptions={themeOptions}>
        <SnackbarAlertProvider>
          <CssBaseline />
          <GlobalStyles />
          <ApolloClientErrorsSnackbarAlert />
          <GoogleAuthProvider clientId={CLIENT_ID}>
            <NoteCreatedSubscription />
            <NoteDeletedSubscription />
            <ExternalChangesSubscription />
            <ActiveNotesManager />
            <ActiveCollabTextsManager />
            <RouterProvider router={router} />
          </GoogleAuthProvider>
        </SnackbarAlertProvider>
      </CustomThemeProvider>
    </CustomApolloClientProvider>
  );
}
