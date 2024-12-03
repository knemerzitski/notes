import { ReactNode } from 'react';

import { GOOGLE } from '../../third-party';
import { GoogleAuthProvider } from '../google/context/google-auth';

export function AppThirdPartyModuleProvider({ children }: { children: ReactNode }) {
  return <GoogleAuthProvider clientId={GOOGLE.clientId}>{children}</GoogleAuthProvider>;
}
