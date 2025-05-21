import { AppBootstrapModuleProvider } from './bootstrap/components/AppBootstrapModuleProvider';
import { AppDndModuleProvider } from './dnd/components/AppDndModuleProvider';
import { AppGraphQLModuleProvider } from './graphql/components/AppGraphQLModuleProvider';
import { AppNoteModuleProvider } from './note/components/AppNoteModuleProvider';
import { AppPersistenceModuleProvider } from './persistence/components/AppPersistenceModuleProvider';
import { AppRouterModuleProvider } from './router/components/AppRouterModuleProvider';
import { AppThemeModuleProvider } from './theme/components/AppThemeModuleProvider';
import { AppThirdPartyModuleProvider } from './third-party/components/AppThirdPartyModuleProvider';
import { AppUserModuleProvider } from './user/components/AppUserModuleProvider';
import { AppFallbackRestoringCache } from './utils/components/AppFallbackRestoringCache';
import { AppUtilsModuleProvider } from './utils/components/AppUtilsModuleProvider';

export function App() {
  return (
    <AppBootstrapModuleProvider>
      <AppGraphQLModuleProvider restoringCacheFallback={<AppFallbackRestoringCache />}>
        <AppPersistenceModuleProvider>
          <AppThemeModuleProvider>
            <AppThirdPartyModuleProvider>
              <AppUtilsModuleProvider>
                <AppUserModuleProvider>
                  <AppNoteModuleProvider>
                    <AppDndModuleProvider>
                      <AppRouterModuleProvider />
                    </AppDndModuleProvider>
                  </AppNoteModuleProvider>
                </AppUserModuleProvider>
              </AppUtilsModuleProvider>
            </AppThirdPartyModuleProvider>
          </AppThemeModuleProvider>
        </AppPersistenceModuleProvider>
      </AppGraphQLModuleProvider>
    </AppBootstrapModuleProvider>
  );
}
