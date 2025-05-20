/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql } from '@apollo/client';
import { MockLink } from '@apollo/client/testing';

import { expect, it } from 'vitest';

import { CollabService, Selection } from '../../../../../collab2/src';

import { createGraphQLService } from '../../../graphql/create/service';
import { createDefaultGraphQLServiceParams } from '../../../graphql-service';

import { NoteTextFieldEditor } from '../../utils/external-state';
import { getUserNoteLinkId } from '../../utils/id';

it('writes NoteExternalState to cache on first read and allows modifications', () => {
  const params = createDefaultGraphQLServiceParams();
  params.terminatingLink = new MockLink([]);
  const service = createGraphQLService(params);
  const cache = service.client.cache;

  const userId = '1';
  const noteId = '2';
  const collabTextId = '3';
  const userNoteLinkId = getUserNoteLinkId(noteId, userId);

  cache.restore({
    [`User:${userId}`]: {
      __typename: 'User',
      id: userId,
    },
    [`UserNoteLink:${userNoteLinkId}`]: {
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
    },
    [`Note:${noteId}`]: {
      __typename: 'Note',
      id: noteId,
      collabText: {
        __ref: `CollabText:${collabTextId}`,
      },
    },
    [`CollabText:${collabTextId}`]: {
      __typename: 'CollabText',
      id: collabTextId,
      headRecord: {
        revision: 4,
        text: 'abc',
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const query: any = cache.readQuery({
    query: gql(`
      query($userBy: UserByInput!, $noteBy: NoteByInput!) {
        signedInUser(by: $userBy){
          noteLink(by: $noteBy) {
            collabService
            textField(name: CONTENT){
              value
              editor
            }
          }
        }
      }
    `),
    variables: {
      userBy: {
        id: userId,
      },
      noteBy: {
        id: noteId,
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const noteLink = query.signedInUser.noteLink;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const editor = noteLink.textField.editor as NoteTextFieldEditor;
  editor.insert('hello', Selection.create(0, 3));

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  cache.restore(JSON.parse(JSON.stringify(cache.extract())));

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const restoredNote: any = cache.readFragment({
    fragment: gql(`
      fragment Test1 on UserNoteLink {
        collabService
      }
    `),
    id: cache.identify({
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
    }),
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const collabService = restoredNote.collabService as CollabService;

  expect(collabService.viewText).toMatchInlineSnapshot(`"{"c":"hello","t":""}"`);
});
