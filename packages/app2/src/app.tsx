import { AppDevicePreferencesModuleProvider } from './device-preferences/components/AppDevicePreferencesModuleProvider';
import { AppGraphQLModuleProvider } from './graphql/components/AppGraphQLModuleProvider';
import { AppThemeModuleProvider } from './theme/components/AppThemeModuleProvider';
import { AppFallbackRestoringCache } from './utils/components/AppFallbackRestoringCache';
import { AppRoutesModuleProvider } from './routes/components/AppRoutesModuleProvider';
import { AppThirdPartyModuleProvider } from './third-party/components/AppThirdPartyModuleProvider';

export function App() {
  return (
    <AppDevicePreferencesModuleProvider>
      <AppGraphQLModuleProvider restoringCacheFallback={<AppFallbackRestoringCache />}>
        <AppThemeModuleProvider>
          <AppThirdPartyModuleProvider>
          <AppRoutesModuleProvider />
          </AppThirdPartyModuleProvider>
        </AppThemeModuleProvider>
      </AppGraphQLModuleProvider>
    </AppDevicePreferencesModuleProvider>
  );
}
