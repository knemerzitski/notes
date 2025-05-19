import { loadDevMessages, loadErrorMessages } from '@apollo/client/dev';
import { maybeExcludeClone, maybeExcludeFreeze } from '@apollo/client/utilities';

import { InsertStrip } from '../../../collab2/src/common/changeset';

import { CollabService, JsonTyperService, JsonFieldTyper } from '../../../collab2/src';

import { NoteExternalState } from '../note/utils/external-state';

if (import.meta.env.DEV) {
  loadDevMessages();
  loadErrorMessages();

  maybeExcludeFreeze(NoteExternalState.prototype);
  maybeExcludeFreeze(CollabService.prototype);
  maybeExcludeFreeze(JsonTyperService.prototype);
  maybeExcludeFreeze(JsonFieldTyper.prototype);
  maybeExcludeFreeze(InsertStrip.prototype);

  maybeExcludeClone(NoteExternalState.prototype);
  maybeExcludeClone(CollabService.prototype);
  maybeExcludeClone(JsonTyperService.prototype);
  maybeExcludeClone(JsonFieldTyper.prototype);
}
