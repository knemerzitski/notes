import {
  ApolloCache,
  DocumentNode,
  FieldFunctionOptions,
  Reference,
} from '@apollo/client';

import { isObjectLike } from '../../../../../utils/src/type-guards/is-object-like';

import { CreateFieldPolicyFn, TypePoliciesContext } from '../../../graphql/types';
import { NoteExternalState } from '../../types';
import { Changeset, createClientStateFromHeadRecord } from '../../../../../collab2/src';
import { number, string, type } from 'superstruct';
import { parseUserNoteLinkId } from '../../utils/id';
import { readUserNoteLinkRef } from '../../utils/read-user-note-link-ref';

const FIELD_NAME = '_external';

// TODO use query instead?
const _External_UserNoteLinkFragment = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: '_External_NoteFragment' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'UserNoteLink' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [{ kind: 'Field', name: { kind: 'Name', value: FIELD_NAME } }],
      },
    },
  ],
} as DocumentNode;

const HeadRecordStruct = type({
  revision: number(),
  text: string(),
});

/**
 * External field contains state that is managed outside cache but
 * still belongs to Note type.
 */
export const _external: CreateFieldPolicyFn = function (ctx: TypePoliciesContext) {
  const externalState = ctx.custom.userNoteLink.externalState;

  return {
    read(existing, options) {
      const { cache, readField, isReference, toReference } = options;

      const userNoteLinkRef = readUserNoteLinkRef(options);

      const id = readField('id', userNoteLinkRef);
      if (typeof id !== 'string') {
        throw new Error(
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          `Expected UserNoteLink.id to be defined string but is ${String(id)}`
        );
      }

      const { userId, noteId } = parseUserNoteLinkId(id);

      // External state is already an instance
      if (externalState.isInstance(existing)) {
        return existing;
      }

      const noteRef = toReference({
        __typename: 'Note',
        id: noteId,
      });
      if (noteRef == null) {
        throw new Error('Failed to make noteId into a reference');
      }

      // Create new state by reading Note.collabText.headText
      const collabTextRef = readField('collabText', noteRef);
      if (!isReference(collabTextRef)) {
        throw new Error('Expected Note.collabText to be a reference');
      }

      // External state is serialized, must parse it first
      if (isObjectLike(existing)) {
        const inst = externalState.parseValue(existing, {
          userId,
          collabTextDataId: collabTextRef.__ref,
          cache,
        });

        // Replace serialized with parsed class instance
        write(userNoteLinkRef, inst, cache);

        return inst;
      }

      const headRecord = readField('headRecord', collabTextRef);
      if (headRecord == null) {
        throw new Error('Expected CollabText.headRecord to be defined');
      }

      const parsedHeadRecord = HeadRecordStruct.create(headRecord);

      const inst = externalState.newValue(
        createClientStateFromHeadRecord({
          revision: parsedHeadRecord.revision,
          text: Changeset.fromText(parsedHeadRecord.text),
        }),
        {
          userId,
          collabTextDataId: collabTextRef.__ref,
          cache,
        }
      );
      write(userNoteLinkRef, inst, cache);

      return inst;
    },
  };
};

export function readExternalState(
  userNoteLinkRef: Reference,
  { readField }: FieldFunctionOptions,
  externalState: TypePoliciesContext['custom']['userNoteLink']['externalState']
): NoteExternalState {
  const inst = readField(FIELD_NAME, userNoteLinkRef);
  if (!externalState.isInstance(inst)) {
    throw new Error(
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      `Failed to read note external state field. Expect and instance but is "${String(inst)}"`
    );
  }

  return inst;
}

function read(
  userNoteLinkRef: Reference,
  cache: Pick<ApolloCache<unknown>, 'readFragment'>
): NoteExternalState | undefined {
  const userNoteLink = cache.readFragment({
    fragment: _External_UserNoteLinkFragment,
    id: userNoteLinkRef.__ref,
  });
  if (!isObjectLike(userNoteLink)) {
    return;
  }

  return userNoteLink[FIELD_NAME] as NoteExternalState;
}

function write(
  userNoteLinkRef: Reference,
  externalState: NoteExternalState,
  cache: Pick<ApolloCache<unknown>, 'writeFragment'>
) {
  cache.writeFragment({
    fragment: _External_UserNoteLinkFragment,
    id: userNoteLinkRef.__ref,
    data: {
      __typename: 'UserNoteLink',
      [FIELD_NAME]: externalState,
    },
    overwrite: true,
    broadcast: false,
  });
}

export function copyExternalState(
  sourceUserNoteLinkRef: Reference,
  targetUserNoteLinkRef: Reference,
  cache: Pick<ApolloCache<unknown>, 'readFragment' | 'writeFragment'>
) {
  const externalState = read(sourceUserNoteLinkRef, cache);
  if (!externalState) {
    return;
  }
  write(targetUserNoteLinkRef, externalState, cache);
  return externalState.service;
}
