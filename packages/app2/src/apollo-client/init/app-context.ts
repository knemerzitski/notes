import { Maybe } from '~utils/types';

export interface AppContext {
  /**
   * Current user id
   */
  readonly userId: Maybe<string>;
}
