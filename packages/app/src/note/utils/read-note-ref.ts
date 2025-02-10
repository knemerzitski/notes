import { FieldFunctionOptions } from '@apollo/client';

export function readNoteRef({
  readField,
  toReference,
  isReference,
}: Pick<FieldFunctionOptions, 'readField' | 'toReference' | 'isReference'>) {
  const __typename = readField('__typename');
  if (__typename === 'Note') {
    const noteId = readField('id');
    if (typeof noteId !== 'string') {
      throw new Error('Expected Note.id to be a string');
    }

    const noteRef = toReference({
      __typename: 'Note',
      id: noteId,
    });
    if (noteRef == null) {
      throw new Error('Failed to make Note into a reference');
    }

    return noteRef;
  } else {
    const noteRef = readField('noteRef');
    if (!isReference(noteRef)) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      throw new Error(` ${String(__typename)}.noteRef to be a reference`);
    }

    return noteRef;
  }
}
