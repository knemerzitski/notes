import { FieldFunctionOptions } from '@apollo/client';

export function readUserNoteLinkRef({
  readField,
  toReference,
  isReference,
}: Pick<FieldFunctionOptions, 'readField' | 'toReference' | 'isReference'>) {
  const __typename = readField('__typename');
  if (__typename === 'UserNoteLink') {
    const userNoteLinkId = readField('id');
    if (typeof userNoteLinkId !== 'string') {
      throw new Error('Expected UserNoteLink.id to be a string');
    }

    const ref = toReference({
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
    });
    if (ref == null) {
      throw new Error('Failed to make UserNoteLink into a reference');
    }

    return ref;
  } else {
    const ref = readField('userNoteLinkRef');
    if (!isReference(ref)) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      throw new Error(` ${String(__typename)}.userNoteLinkRef to be a reference`);
    }

    return ref;
  }
}
