import { loadDevMessages, loadErrorMessages } from '@apollo/client/dev';
import { maybeExcludeClone, maybeExcludeFreeze } from '@apollo/client/utilities';

import { CollabService } from '../../../collab/src/client/collab-service';
import { KeySimpleText } from '../../../collab/src/editor/json-text';
import { SimpleTextEditor } from '../../../collab/src/editor/simple-text';

import { NoteExternalState } from '../note/utils/external-state';

if (import.meta.env.DEV) {
  loadDevMessages();
  loadErrorMessages();

  maybeExcludeFreeze(NoteExternalState.prototype);
  maybeExcludeFreeze(CollabService.prototype);
  maybeExcludeFreeze(SimpleTextEditor.prototype);
  maybeExcludeFreeze(KeySimpleText.prototype);

  maybeExcludeClone(NoteExternalState.prototype);
  maybeExcludeClone(CollabService.prototype);
  maybeExcludeClone(SimpleTextEditor.prototype);
  maybeExcludeClone(KeySimpleText.prototype);
}
