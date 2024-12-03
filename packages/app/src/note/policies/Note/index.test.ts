/* eslint-disable @typescript-eslint/no-explicit-any */
import { MockLink } from '@apollo/client/testing';
import { createDefaultGraphQLServiceParams } from '../../../graphql-service';
import { createGraphQLService } from '../../../graphql/create/service';
import { expect, it } from 'vitest';
import { gql } from '@apollo/client';
import { CollabService } from '~collab/client/collab-service';
import { NoteTextFieldEditor } from '../../external-state/note';

it('writes NoteExternalState to cache on first read and allows modifications', () => {
  const params = createDefaultGraphQLServiceParams();
  params.terminatingLink = new MockLink([]);
  const service = createGraphQLService(params);
  const cache = service.client.cache;

  cache.restore({
    'Note:1': {
      __typename: 'Note',
      id: '1',
      collabText: {
        __ref: 'CollabText:1',
      },
    },
    'CollabText:1': {
      __typename: 'CollabText',
      id: '1',
      collabText: {
        __ref: 'CollabText:1',
      },
      headText: {
        revision: 4,
        changeset: ['abc'],
      },
    },
  });

  const note: any = cache.readFragment({
    fragment: gql(`
      fragment Test2 on Note {
        collabService
        textField(name: CONTENT) {
          value
          editor
        }
      }
    `),
    id: 'Note:1',
  });
  const editor = note.textField.editor as NoteTextFieldEditor;
  editor.insert('hello', {
    start: 0,
    end: 3,
  });

  cache.restore(JSON.parse(JSON.stringify(cache.extract())));

  const restoredNote: any = cache.readFragment({
    fragment: gql(`
      fragment Test1 on Note {
        collabService
      }
    `),
    id: 'Note:1',
  });
  const collabService = restoredNote.collabService as CollabService;

  expect(collabService.viewText).toMatchInlineSnapshot(
    `"{"CONTENT":"hello","TITLE":""}"`
  );
});
