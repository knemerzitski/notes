import { AppGraphQLServiceProvider } from './graphql/components/AppGraphQLServiceProvider';
import { AppThemeProvider } from './theme/components/AppThemeProvider';

export function App() {
  return (
    <AppGraphQLServiceProvider>
      <AppThemeProvider>Hello App!</AppThemeProvider>
    </AppGraphQLServiceProvider>
  );
}
