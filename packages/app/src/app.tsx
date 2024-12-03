import { AppBootstrapModuleProvider } from './bootstrap/components/AppBootstrapModuleProvider';
import { AppDndModuleProvider } from './dnd/components/AppDndModuleProvider';
import { AppGraphQLModuleProvider } from './graphql/components/AppGraphQLModuleProvider';
import { AppNoteModuleProvider } from './note/components/AppNoteModuleProvider';
import { AppThemeModuleProvider } from './theme/components/AppThemeModuleProvider';
import { AppThirdPartyModuleProvider } from './third-party/components/AppThirdPartyModuleProvider';
import { AppUserModuleProvider } from './user/components/AppUserModuleProvider';
import { AppFallbackRestoringCache } from './utils/components/AppFallbackRestoringCache';
import { AppRoutesModuleProvider } from './utils/components/AppRoutesModuleProvider';
import { AppUtilsModuleProvider } from './utils/components/AppUtilsModuleProvider';

export function App() {
  return (
    <AppBootstrapModuleProvider>
      <AppGraphQLModuleProvider restoringCacheFallback={<AppFallbackRestoringCache />}>
        <AppThemeModuleProvider>
          <AppThirdPartyModuleProvider>
            <AppUtilsModuleProvider>
              <AppUserModuleProvider>
                <AppDndModuleProvider>
                  <AppNoteModuleProvider>
                    <AppRoutesModuleProvider />
                  </AppNoteModuleProvider>
                </AppDndModuleProvider>
              </AppUserModuleProvider>
            </AppUtilsModuleProvider>
          </AppThirdPartyModuleProvider>
        </AppThemeModuleProvider>
      </AppGraphQLModuleProvider>
    </AppBootstrapModuleProvider>
  );
}
