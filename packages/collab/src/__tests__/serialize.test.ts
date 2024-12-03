/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeEach, expect, it } from 'vitest';

import { Changeset } from '../changeset';
import { CollabService } from '../client/collab-service';

import { RevisionRecords } from '../records/revision-records';

import { createHelperCollabEditingEnvironment } from './helpers/server-client';

let helper: ReturnType<typeof createHelperCollabEditingEnvironment<'A' | 'B'>>;

beforeEach(() => {
  helper = createHelperCollabEditingEnvironment({
    server: {
      records: new RevisionRecords({
        tailText: {
          changeset: Changeset.parseValue(['[ZERO]']),
          revision: 4,
        },
      }),
    },
    clientNames: ['A', 'B'],
  });
});

it('restores serialized service', () => {
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

  const expectedSerialized = client.A.service.serialize();

  const parsedOptions = CollabService.parseValue(expectedSerialized);
  const actualReserialized = new CollabService(parsedOptions).serialize();

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
  client.A.service.undo();
  client.A.service.undo();

  expect(client.A.service.submitChanges()).toEqual({
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
