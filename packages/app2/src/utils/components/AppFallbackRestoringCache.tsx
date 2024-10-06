import { CircularProgress } from '@mui/material';
import { AppThemeProvider } from '../../theme/components/AppThemeProvider';
import { PageCenterBox } from './PageCenterBox';

export function AppFallbackRestoringCache() {
  return (
    <AppThemeProvider>
      <PageCenterBox>
        <CircularProgress />
      </PageCenterBox>
    </AppThemeProvider>
  );
}
