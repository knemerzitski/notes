/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql } from '@apollo/client';
import { MockLink } from '@apollo/client/testing';

import { expect, it } from 'vitest';

import { CollabService } from '../../../../../collab/src/client/collab-service';

import { createGraphQLService } from '../../../graphql/create/service';
import { createDefaultGraphQLServiceParams } from '../../../graphql-service';

import { NoteTextFieldEditor } from '../../utils/external-state';
import { NoteTextFieldName } from '../../../__generated__/graphql';

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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const editor = note.textField.editor as NoteTextFieldEditor<NoteTextFieldName>;
  editor.insert('hello', {
    start: 0,
    end: 3,
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  cache.restore(JSON.parse(JSON.stringify(cache.extract())));

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const restoredNote: any = cache.readFragment({
    fragment: gql(`
      fragment Test1 on Note {
        collabService
      }
    `),
    id: 'Note:1',
  });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const collabService = restoredNote.collabService as CollabService;

  expect(collabService.viewText).toMatchInlineSnapshot(
    `"{"CONTENT":"hello","TITLE":""}"`
  );
});
