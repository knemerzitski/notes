/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeEach, expect, it } from 'vitest';

import { Changeset } from '../changeset/changeset';
import { CollabEditor } from '../client/collab-editor';
import { ChangesetRevisionRecords } from '../records/changeset-revision-records';
import { newServerRecords } from '../records/server-records';

import { createHelperCollabEditingEnvironment } from './helpers/server-client';

let helper: ReturnType<typeof createHelperCollabEditingEnvironment<'A' | 'B'>>;

beforeEach(() => {
  helper = createHelperCollabEditingEnvironment({
    server: {
      changesetRecords: new ChangesetRevisionRecords({
        revisionRecords: newServerRecords(),
        tailText: {
          changeset: Changeset.parseValue(['[ZERO]']),
          revision: 4,
        },
      }),
    },
    clientNames: ['A', 'B'],
  });
});

it('restores serialized editor', () => {
  const { client } = helper;

  client.A.setCaretPosition(6);
  client.A.insertText('[a0]');
  client.A.insertText('[a1]');
  client.A.insertText('[a2]');
  client.A.submitChangesInstant();
  client.A.insertText('[b0]');
  client.A.insertText('[b1]');
  client.A.submitChangesInstant();
  client.A.insertText('[c0]');
  client.A.insertText('[c1]');
  const sendingA = client.A.submitChanges();
  client.A.insertText('[d0]');
  client.A.insertText('[d1]');

  client.B.insertText('a');
  client.B.submitChanges().serverReceive();
  sendingA.serverReceive().acknowledgeAndSendToOtherClients();

  const expectedSerialized = client.A.editor.serialize();

  const parsedOptions = CollabEditor.parseValue(expectedSerialized);
  const actualReserialized = new CollabEditor(parsedOptions).serialize();

  expect(actualReserialized).toStrictEqual(expectedSerialized);
});

it('submits correct selection when undo before server index', () => {
  const { client } = helper;

  client.A.insertText('[a0]');
  client.A.insertText('[a1]');
  client.A.insertText('[a2]');
  client.A.submitChangesInstant();
  client.A.insertText('[b0]');
  client.A.insertText('[b1]');
  client.A.submitChangesInstant();
  client.A.editor.undo();
  client.A.editor.undo();

  expect(client.A.editor.submitChanges()).toEqual({
    userGeneratedId: expect.any(String),
    revision: 6,
    changeset: Changeset.parseValue([
      [0, 11],
      [20, 25],
    ]),
    beforeSelection: { start: 20, end: 20 },
    afterSelection: { start: 12, end: 12 },
  });
});
