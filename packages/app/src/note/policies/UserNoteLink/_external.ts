import { ApolloCache, FieldFunctionOptions, makeReference } from '@apollo/client';

import { number, string, type } from 'superstruct';

import { isObjectLike } from '../../../../../utils/src/type-guards/is-object-like';

import { Changeset, createClientStateFromHeadRecord } from '../../../../../collab2/src';
import { gql } from '../../../__generated__';
import { CreateFieldPolicyFn, TypePoliciesContext } from '../../../graphql/types';
import { NoteExternalState } from '../../types';
import { parseUserNoteLinkId } from '../../utils/id';
import { readUserNoteLinkId } from '../../utils/read-user-note-link-id';

const UserNoteLinkExternal_UserNoteLinkFragment = gql(`
  fragment UserNoteLinkExternal_UserNoteLinkFragment on UserNoteLink {
    id
    external
  }
`);

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

      const userNoteLinkId = readUserNoteLinkId(options);

      const { userId, noteId } = parseUserNoteLinkId(userNoteLinkId);

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
        write(userNoteLinkId, inst, cache);

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
      write(userNoteLinkId, inst, cache);

      return inst;
    },
  };
};

export function readExternalState(
  userNoteLinkId: string,
  { cache, readField }: FieldFunctionOptions,
  externalState: TypePoliciesContext['custom']['userNoteLink']['externalState']
): NoteExternalState {
  const dataId = cache.identify({
    __typename: 'UserNoteLink',
    id: userNoteLinkId,
  });
  if (!dataId) {
    throw new Error(`Failed to get dataId from UserNoteLink.id "${userNoteLinkId}"`);
  }

  const inst = readField('external', makeReference(dataId));
  if (!externalState.isInstance(inst)) {
    throw new Error(
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      `Failed to read note external state field. Expected an instance but is "${String(inst)}"`
    );
  }

  return inst;
}

function read(
  userNoteLinkId: string,
  cache: Pick<ApolloCache<unknown>, 'readFragment' | 'identify'>
): NoteExternalState | undefined {
  const userNoteLink = cache.readFragment({
    fragment: UserNoteLinkExternal_UserNoteLinkFragment,
    id: cache.identify({
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
    }),
  });
  if (!isObjectLike(userNoteLink)) {
    return;
  }

  return userNoteLink.external;
}

function write(
  userNoteLinkId: string,
  externalState: NoteExternalState,
  cache: Pick<ApolloCache<unknown>, 'writeFragment' | 'identify'>
) {
  cache.writeFragment({
    fragment: UserNoteLinkExternal_UserNoteLinkFragment,
    id: cache.identify({
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
    }),
    data: {
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
      external: externalState,
    },
    overwrite: true,
    broadcast: false,
  });
}

export function copyExternalState(
  sourceUserNoteLinkId: string,
  targetUserNoteLinkId: string,
  cache: Pick<ApolloCache<unknown>, 'readFragment' | 'writeFragment' | 'identify'>
) {
  const externalState = read(sourceUserNoteLinkId, cache);
  if (!externalState) {
    return;
  }
  write(targetUserNoteLinkId, externalState, cache);
  return externalState.service;
}
