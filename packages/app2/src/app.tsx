import { AppDevicePreferencesModuleProvider } from './device-preferences/components/AppDevicePreferencesModuleProvider';
import { AppGraphQLModuleProvider } from './graphql/components/AppGraphQLModuleProvider';
import { AppThemeModuleProvider } from './theme/components/AppThemeModuleProvider';
import { AppFallbackRestoringCache } from './utils/components/AppFallbackRestoringCache';
import { AppRoutesModuleProvider } from './routes/components/AppRoutesModuleProvider';

export function App() {
  return (
    <AppDevicePreferencesModuleProvider>
      <AppGraphQLModuleProvider restoringCacheFallback={<AppFallbackRestoringCache />}>
        <AppThemeModuleProvider>
          <AppRoutesModuleProvider />
        </AppThemeModuleProvider>
      </AppGraphQLModuleProvider>
    </AppDevicePreferencesModuleProvider>
  );
}
