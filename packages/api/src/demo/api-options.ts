// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ApiOptions } from '../graphql/types';

declare module '../graphql/types' {
  export interface ApiOptions {
    /**
     * Run api in demo mode. Allows signin in with demo users.
     * @default false
     */
    demoMode?: boolean;
  }
}
