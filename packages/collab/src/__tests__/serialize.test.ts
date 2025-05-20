import { expect, it } from 'vitest';

import { Changeset } from '../common/changeset';
import { Selection } from '../common/selection';

import { createCollabSandbox } from './helpers/collab-sandbox';

const cs = Changeset.parse;

it('restores serialized service', () => {
  const {
    server,
    client: { A, B },
  } = createCollabSandbox({
    server: {
      records: [
        {
          revision: 4,
          changeset: cs('0:"ZERO"'),
          authorId: '',
          idempotencyId: '',
          selectionInverse: Selection.ZERO,
          selection: Selection.ZERO,
        },
      ],
    },
    clients: ['A', 'B'],
  });

  A.setCaret(6);
  A.insert('[a0]');
  A.insert('[a1]');
  A.insert('[a2]');
  A.submitChangesInstant();
  A.insert('[b0]');
  A.insert('[b1]');
  A.submitChangesInstant();
  A.insert('[c0]');
  A.insert('[c1]');
  const sendingA = A.submitChanges();
  A.insert('[d0]');
  A.insert('[d1]');

  B.insert('a');
  B.submitChanges().serverReceive();
  sendingA.serverReceive().acknowledgeAndSendToOtherClients();

  const expectedSerialized = A.serialize();

  const A2 = server.createClient('A2');
  A2.deserialize(JSON.parse(JSON.stringify(expectedSerialized)));

  const actualSerialized = A2.serialize();

  expect(actualSerialized).toStrictEqual(expectedSerialized);
});
