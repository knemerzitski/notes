import { loadDevMessages, loadErrorMessages } from '@apollo/client/dev';
import { maybeExcludeClone, maybeExcludeFreeze } from '@apollo/client/utilities';

import { CollabService } from '~collab/client/collab-service';
import { KeySimpleText } from '~collab/editor/json-text';
import { SimpleTextEditor } from '~collab/editor/simple-text';

import { NoteExternalState } from '../note/external-state/note';

if (!import.meta.env.PROD) {
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
