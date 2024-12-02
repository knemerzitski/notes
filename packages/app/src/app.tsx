import { AppBootstrapModuleProvider } from './bootstrap/components/AppBootstrapModuleProvider';
import { AppGraphQLModuleProvider } from './graphql/components/AppGraphQLModuleProvider';
import { AppThemeModuleProvider } from './theme/components/AppThemeModuleProvider';
import { AppFallbackRestoringCache } from './utils/components/AppFallbackRestoringCache';
import { AppRoutesModuleProvider } from './utils/components/AppRoutesModuleProvider';
import { AppUtilsModuleProvider } from './utils/components/AppUtilsModuleProvider';
import { AppUserModuleProvider } from './user/components/AppUserModuleProvider';
import { AppThirdPartyModuleProvider } from './third-party/components/AppThirdPartyModuleProvider';
import { AppNoteModuleProvider } from './note/components/AppNoteModuleProvider';
import { AppDndModuleProvider } from './dnd/components/AppDndModuleProvider';

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
