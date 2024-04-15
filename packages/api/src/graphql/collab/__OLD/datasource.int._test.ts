import { it, describe, beforeEach, vi, expect, afterEach } from 'vitest';
import { CollabText, resetDatabase } from '../../../test/helpers/mongodb';
import {
  CollaborativeDocumentsDataSource,
  CollaborativeDocumentDataSource,
} from './datasource';
import {
  RevisionRecord,
  createInitialDocument,
} from '~collab/adapters/mongodb/collaborative-document';
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { Changeset } from '~collab/changeset/changeset';

function createRecord(revision: number): RevisionRecord {
  return {
    creatorUserId: ObjectId.createFromHexString(faker.database.mongodbObjectId()),
    userGeneratedId: 'foo',
    change: {
      revision,
      changeset: Changeset.fromInsertion(`edit_${revision}`),
    },
    beforeSelection: {
      start: 0,
    },
    afterSelection: {
      start: 0,
    },
  };
}

async function createDocument(recordsCount: number) {
  const initialData = createInitialDocument(
    ObjectId.createFromHexString(faker.database.mongodbObjectId()),
    'start'
  );
  initialData.records.push(
    ...[...new Array<undefined>(recordsCount - 1)].map((_, i) => createRecord(i + 1))
  );
  const rawDoc = new CollabText(initialData);
  await rawDoc.save();
  return rawDoc;
}

describe.skip('CollaborativeDocumentDataSource', () => {
  faker.seed(88776);

  const dbAggregateMethod = vi.spyOn(CollabText, 'aggregate');

  let dataSource: CollaborativeDocumentsDataSource;
  let doc1Source: CollaborativeDocumentDataSource;
  let doc2Source: CollaborativeDocumentDataSource;

  beforeEach(async () => {
    await resetDatabase();
    dbAggregateMethod.mockClear();
    const [doc1, doc2] = await Promise.all([createDocument(10), createDocument(10)]);

    dataSource = new CollaborativeDocumentsDataSource(CollabText);
    doc1Source = new CollaborativeDocumentDataSource(dataSource, doc1._id);
    doc2Source = new CollaborativeDocumentDataSource(dataSource, doc2._id);
  });

  afterEach(() => {
    expect(dbAggregateMethod).toHaveBeenCalledOnce();
  });

  it('loads headDocument', async () => {
    const head = await doc1Source.getHeadDocument();
    expect(head.changeset.joinInsertions()).toStrictEqual('start');
  });

  it('loads two docments heads in a single call', async () => {
    await Promise.all([doc1Source.getHeadDocument(), doc2Source.getHeadDocument()]);
  });

  it('loads tailDocument', async () => {
    const head = await doc1Source.getTailDocument();
    expect(head.changeset.joinInsertions()).toStrictEqual('');
  });

  describe('getRecordsBySlice', () => {
    it.each([
      [0, 3, [0, 1, 2]],
      [3, 6, [3, 4, 5]],
      [6, 12, [6, 7, 8, 9]],
      [7, -1, [7, 8, 9]],
      [7, -2, [7, 8]],
      [-4, -2, [6, 7, 8]],
    ])('one: start %s end %s => %s', async (start, end, expected) => {
      const records = await doc1Source.getRecordsBySlice(start, end);
      expect(records.map((record) => record.change.revision)).toStrictEqual(expected);
    });

    it.each([
      [3, 6, [3, 4, 5], 1, 4, [1, 2, 3]],
      [0, 2, [0, 1], 7, -1, [7, 8, 9]],
    ])(
      'two: start %s end %s => %s, start %s end %s => %s',
      async (start1, end1, expected1, start2, end2, expected2) => {
        const [records1, records2] = await Promise.all([
          doc1Source.getRecordsBySlice(start1, end1),
          doc2Source.getRecordsBySlice(start2, end2),
        ]);
        expect(records1.map((record) => record.change.revision)).toStrictEqual(expected1);
        expect(records2.map((record) => record.change.revision)).toStrictEqual(expected2);
      }
    );
  });

  describe('getRecordsByRevision', () => {
    it.each([
      [3, 4, [3, 4]],
      [7, 9, [7, 8, 9]],
      [undefined, 2, [0, 1, 2]],
      [7, undefined, [7, 8, 9]],
    ])('one: start %s end %s => %s', async (startRevision, endRevision, expected) => {
      const records = await doc1Source.getRecordsByRevision({
        startRevision,
        endRevision,
      });
      expect(records.map((record) => record.change.revision)).toStrictEqual(expected);
    });

    it.each([
      [3, 6, [3, 4, 5, 6], 1, 4, [1, 2, 3, 4]],
      [0, 2, [0, 1, 2], 3, 4, [3, 4]],
    ])(
      'two: start %s end %s => %s, start %s end %s => %s',
      async (start1, end1, expected1, start2, end2, expected2) => {
        const [records1, records2] = await Promise.all([
          doc1Source.getRecordsByRevision({ startRevision: start1, endRevision: end1 }),
          doc2Source.getRecordsByRevision({ startRevision: start2, endRevision: end2 }),
        ]);
        expect(records1.map((record) => record.change.revision)).toStrictEqual(expected1);
        expect(records2.map((record) => record.change.revision)).toStrictEqual(expected2);
      }
    );
  });

  it('getDocumentAtRevision', async () => {
    const [change1, change2] = await Promise.all([
      doc1Source.getDocumentAtRevision(5),
      doc2Source.getDocumentAtRevision(7),
    ]);
    expect(change1).toStrictEqual({
      revision: 5,
      changeset: Changeset.fromInsertion('edit_5'),
    });
    expect(change2).toStrictEqual({
      revision: 7,
      changeset: Changeset.fromInsertion('edit_7'),
    });
  });
});
