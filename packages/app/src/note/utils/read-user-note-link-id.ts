import { FieldFunctionOptions } from '@apollo/client';

export function readUserNoteLinkId({
  readField,
}: Pick<FieldFunctionOptions, 'readField'>): string {
  const __typename = readField('__typename');
  if (__typename === 'UserNoteLink') {
    const id = readField('id');
    if (typeof id !== 'string') {
      throw new Error('Expected UserNoteLink.id to be a string');
    }

    return id;
  } else {
    const id = readField('userNoteLinkId');
    if (typeof id !== 'string') {
      throw new Error('Expected userNoteLinkId to be a string');
    }

    return id;
  }
}
