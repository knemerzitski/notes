import { AppPreferencesStorageProvider } from './device-preferences/components/AppPreferencesStorageProvider';
import { AppGraphQLServiceProvider } from './graphql/components/AppGraphQLServiceProvider';
import { AppThemeProvider } from './theme/components/AppThemeProvider';
import { AppFallbackRestoringCache } from './utils/components/AppFallbackRestoringCache';
import { AppRouterProvider } from './routes/components/AppRouterProvider';

export function App() {
  return (
    <AppPreferencesStorageProvider>
      <AppGraphQLServiceProvider restoringCacheFallback={<AppFallbackRestoringCache />}>
        <AppThemeProvider>
          <AppRouterProvider />
        </AppThemeProvider>
      </AppGraphQLServiceProvider>
    </AppPreferencesStorageProvider>
  );
}
