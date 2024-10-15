import { CircularProgress } from '@mui/material';
import { AppThemeModuleProvider } from '../../theme/components/AppThemeModuleProvider';
import { PageCenterBox } from './PageCenterBox';

export function AppFallbackRestoringCache() {
  return (
    <AppThemeModuleProvider>
      <PageCenterBox>
        <CircularProgress />
      </PageCenterBox>
    </AppThemeModuleProvider>
  );
}
