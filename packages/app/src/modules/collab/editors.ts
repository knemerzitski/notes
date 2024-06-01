import { FieldFunctionOptions } from '@apollo/client';
import { CollabEditor } from '~collab/client/collab-editor';
import { RevisionChangeset } from '~collab/records/record';

export function createEditorInFieldPolicy({
  readField,
}: Pick<FieldFunctionOptions, 'readField'>) {
  const headText = readField('headText');
  if (!headText) {
    throw new Error('Expected CollabText.headText to be defined to create editor');
  }

  return CollabEditor.headTextAsOptions(RevisionChangeset.parseValue(headText));
}
