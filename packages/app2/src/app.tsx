import { AppPreferencesStorageProvider } from './device-preferences/components/AppPreferencesStorageProvider';
import { AppGraphQLServiceProvider } from './graphql/components/AppGraphQLServiceProvider';
import { AppThemeProvider } from './theme/components/AppThemeProvider';
import { AppFallbackRestoringCache } from './utils/components/AppFallbackRestoringCache';

export function App() {
  return (
    <AppPreferencesStorageProvider>
      <AppGraphQLServiceProvider restoringCacheFallback={<AppFallbackRestoringCache />}>
        <AppThemeProvider>Hello App!</AppThemeProvider>
      </AppGraphQLServiceProvider>
    </AppPreferencesStorageProvider>
  );
}
