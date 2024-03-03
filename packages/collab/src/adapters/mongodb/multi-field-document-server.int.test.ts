import { MongoClient, ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '../../changeset/changeset';

import { MultiFieldDocumentServer, DocumentValue } from './multi-field-document-server';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const DB_URI = process.env.TEST_MONGODB_URI!;

interface Note {
  title: DocumentValue;
  content: DocumentValue;
}

interface Text {
  content: DocumentValue;
  normalNumber?: number;
}

describe('CollaborationFieldsDocument', async () => {
  const client = new MongoClient(DB_URI);
  await client.connect();
  const db = client.db('collabTest');

  describe('single field', () => {
    const collection = db.collection<Text>('text');
    let documentId: ObjectId;
    let changesDocServer: MultiFieldDocumentServer<'content', Text>;

    beforeEach(async () => {
      await collection.deleteMany();
      const insertResult = await collection.insertOne({
        content: {
          latestText: 'content',
          latestRevision: 0,
          records: [
            {
              changeset: ['content'],
              revision: 0,
            },
          ],
        },
      });
      documentId = insertResult.insertedId;

      changesDocServer = new MultiFieldDocumentServer(collection);
    });

    async function findDocument() {
      return await collection.findOne({
        _id: documentId,
      });
    }

    it('queueing does not affect database', async () => {
      changesDocServer.queueChange('content', {
        changeset: Changeset.parseValue([[0, 5], 't <- after content']),
        revision: 0,
      });

      const fetchedDoc = await findDocument();
      expect(fetchedDoc).toStrictEqual({
        _id: documentId,
        content: {
          latestText: 'content',
          latestRevision: 0,
          records: [{ changeset: ['content'], revision: 0 }],
        },
      });
    });

    it('inserts change to revision records and updates latest text', async () => {
      changesDocServer.queueChange('content', {
        changeset: Changeset.parseValue([[0, 5], 't <- after content']),
        revision: 0,
      });

      const updateResult = await changesDocServer.updateOneWithClient(client, {
        _id: documentId,
      });
      expect(updateResult).toStrictEqual({
        content: [
          {
            changeset: Changeset.parseValue([[0, 5], 't <- after content']),
            revision: 1,
          },
        ],
      });

      const fetchedDoc = await findDocument();
      expect(fetchedDoc).toStrictEqual({
        _id: documentId,
        content: {
          latestText: 'content <- after content',
          latestRevision: 1,
          records: [
            { changeset: ['content'], revision: 0 },
            { changeset: [[0, 5], 't <- after content'], revision: 1 },
          ],
        },
      });
    });

    it('inserts two changes in a row', async () => {
      changesDocServer.queueChange('content', {
        changeset: Changeset.parseValue([[0, 5], 't <- after content']),
        revision: 0,
      });
      changesDocServer.queueChange('content', {
        changeset: Changeset.parseValue(['[START]', [0, 6]]),
        revision: 0,
      });

      const updateResult = await changesDocServer.updateOneWithClient(client, {
        _id: documentId,
      });
      expect(updateResult).toStrictEqual({
        content: [
          {
            changeset: Changeset.parseValue([[0, 5], 't <- after content']),
            revision: 1,
          },
          {
            changeset: Changeset.parseValue(['[START]', [0, 23]]),
            revision: 2,
          },
        ],
      });

      const fetchedDoc = await findDocument();
      expect(fetchedDoc).toStrictEqual({
        _id: documentId,
        content: {
          latestText: '[START]content <- after content',
          latestRevision: 2,
          records: [
            { changeset: ['content'], revision: 0 },
            { changeset: [[0, 5], 't <- after content'], revision: 1 },
            { changeset: ['[START]', [0, 23]], revision: 2 },
          ],
        },
      });
    });

    it('updateOne can be used to update other fields', async () => {
      const updateResult = await changesDocServer.updateOneWithClient(
        client,
        {
          _id: documentId,
        },
        {
          $set: {
            normalNumber: 10,
          },
        }
      );
      expect(updateResult).toStrictEqual({});

      const fetchedDoc = await findDocument();
      expect(fetchedDoc).toStrictEqual({
        _id: documentId,
        content: {
          latestText: 'content',
          latestRevision: 0,
          records: [{ changeset: ['content'], revision: 0 }],
        },
        normalNumber: 10,
      });
    });
  });

  describe('two fields', () => {
    const collection = db.collection<Note>('note');
    let documentId: ObjectId;
    let changesDocServer: MultiFieldDocumentServer<'title' | 'content', Note>;

    beforeEach(async () => {
      await collection.deleteMany();
      const insertResult = await collection.insertOne({
        title: {
          latestRevision: 0,
          latestText: 'title',
          records: [
            {
              revision: 0,
              changeset: ['title'],
            },
          ],
        },
        content: {
          latestRevision: 0,
          latestText: 'content',
          records: [
            {
              revision: 0,
              changeset: ['content'],
            },
          ],
        },
      });
      documentId = insertResult.insertedId;

      changesDocServer = new MultiFieldDocumentServer(collection);
    });

    async function findDocument() {
      return await collection.findOne({
        _id: documentId,
      });
    }

    it('inserts changes for both fields', async () => {
      changesDocServer.queueChange('title', {
        changeset: Changeset.parseValue([[0, 4], '[A]']),
        revision: 0,
      });
      changesDocServer.queueChange('content', {
        changeset: Changeset.parseValue([[0, 6], '[B]']),
        revision: 0,
      });

      const updateResult = await changesDocServer.updateOneWithClient(client, {
        _id: documentId,
      });
      expect(updateResult).toStrictEqual({
        title: [
          {
            changeset: Changeset.parseValue([[0, 4], '[A]']),
            revision: 1,
          },
        ],
        content: [
          {
            changeset: Changeset.parseValue([[0, 6], '[B]']),
            revision: 1,
          },
        ],
      });

      const fetchedDoc = await findDocument();
      expect(fetchedDoc).toStrictEqual({
        _id: documentId,
        title: {
          latestText: 'title[A]',
          latestRevision: 1,
          records: [
            { changeset: ['title'], revision: 0 },
            { changeset: [[0, 4], '[A]'], revision: 1 },
          ],
        },
        content: {
          latestText: 'content[B]',
          latestRevision: 1,
          records: [
            { changeset: ['content'], revision: 0 },
            { changeset: [[0, 6], '[B]'], revision: 1 },
          ],
        },
      });
    });
  });

  describe('concurrency', async () => {
    const client2 = new MongoClient(DB_URI);
    await client2.connect();
    const db2 = client2.db('collabTest');

    const collection = db.collection<Text>('text');
    let changesDocServer: MultiFieldDocumentServer<'content', Text>;

    const collection2 = db2.collection<Text>('text');
    let changesDocServer2: MultiFieldDocumentServer<'content', Text>;

    let documentId: ObjectId;

    beforeEach(async () => {
      await collection.deleteMany();
      const insertResult = await collection.insertOne({
        content: {
          latestText: 'abcdef',
          latestRevision: 5,
          records: [
            {
              changeset: ['a'],
              revision: 0,
            },
            {
              changeset: [0, 'b'],
              revision: 1,
            },
            {
              changeset: [[0, 1], 'c'],
              revision: 2,
            },
            {
              changeset: [[0, 2], 'd'],
              revision: 3,
            },
            {
              changeset: [[0, 3], 'e'],
              revision: 4,
            },
            {
              changeset: [[0, 4], 'f'],
              revision: 5,
            },
          ],
        },
      });
      documentId = insertResult.insertedId;

      changesDocServer = new MultiFieldDocumentServer(collection);

      changesDocServer2 = new MultiFieldDocumentServer(collection2);
    });

    async function findDocument() {
      return await collection.findOne({
        _id: documentId,
      });
    }

    it.each([...new Array<number>(4).keys()])(
      'handles two clients changes for the same revision at the same time using transactions (attempt %i)',
      async () => {
        changesDocServer.queueChange('content', {
          changeset: Changeset.parseValue([[0, 5], 'A']),
          revision: 5,
        });
        changesDocServer2.queueChange('content', {
          changeset: Changeset.parseValue([[0, 5], 'B']),
          revision: 5,
        });

        await Promise.all([
          changesDocServer.updateOneWithClient(client, {
            _id: documentId,
          }),
          changesDocServer2.updateOneWithClient(client2, {
            _id: documentId,
          }),
        ]);

        const fetchedDoc = await findDocument();
        expect(
          fetchedDoc?.content.latestText,
          'updateOne is not using a transaction'
        ).toStrictEqual('abcdefAB');
        expect([
          [
            { changeset: [[0, 5], 'A'], revision: 6 },
            { changeset: [[0, 6], 'B'], revision: 7 },
          ],
          [
            { changeset: [[0, 5], 'B'], revision: 6 },
            { changeset: [[0, 5], 'A', 6], revision: 7 },
          ],
        ]).toContainEqual(fetchedDoc?.content.records.slice(6));
      }
    );
  });
});
