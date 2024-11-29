import { ReactNode } from 'react';
import { GoogleAuthProvider } from '../google/context/google-auth';
import { GOOGLE } from '../../third-party';

export function AppThirdPartyModuleProvider({ children }: { children: ReactNode }) {
  return <GoogleAuthProvider clientId={GOOGLE.clientId}>{children}</GoogleAuthProvider>;
}
