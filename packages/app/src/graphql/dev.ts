import { loadDevMessages, loadErrorMessages } from '@apollo/client/dev';
import { maybeExcludeFreeze } from '@apollo/client/utilities';

import { InsertStrip } from '../../../collab/src/common/changeset';

if (import.meta.env.DEV) {
  loadDevMessages();
  loadErrorMessages();

  maybeExcludeFreeze(InsertStrip.prototype);
}
