import {
  Document,
  MongoClient,
  Filter,
  UpdateFilter,
  Collection,
  UpdateOptions,
  MatchKeysAndValues,
  PushOperator,
  ClientSession,
} from 'mongodb';

import { Changeset, RevisionChangeset } from '../../changeset/changeset';
import { DocumentServer } from '../../server/document-server';

export enum MultiFieldDocumentServerErrorCode {
  /**
   * Failed to find document in the database with given filter.
   */
  DocumentNotFound = 'DOCUMENT_NOT_FOUND',
  /**
   * A record is missing in the database.
   */
  RecordMissing = 'RECORD_MISSING',
}

export class MultiFieldDocumentServerError extends Error {
  code: MultiFieldDocumentServerErrorCode;

  constructor(code: MultiFieldDocumentServerErrorCode, options?: ErrorOptions) {
    super(code.toString(), options);
    this.code = code;
  }
}

export interface RecordValue<T = unknown> {
  changeset: T;
  revision: number;
}

export interface DocumentValue<T = unknown> {
  latestText: string;
  latestRevision: number;
  records: RecordValue<T>[];
}

export function newDocumentInsertion(text: string): DocumentValue<Changeset> {
  return {
    latestText: text,
    latestRevision: 0,
    records: [
      {
        revision: 0,
        changeset: Changeset.fromInsertion(text),
      },
    ],
  };
}

type RelevantDocumentValue<T = unknown> = Omit<DocumentValue<T>, 'records'> & {
  relevantRecords: DocumentValue<T>['records'];
};

class FieldChanges<T extends string> {
  readonly fieldPath: T;
  private _changes: RevisionChangeset[] = [];
  get changes() {
    return this._changes;
  }

  private oldestRevision: number | null = null;

  constructor(fieldPath: T) {
    this.fieldPath = fieldPath;
  }

  add(change: RevisionChangeset) {
    this._changes.push(change);
    this.oldestRevision =
      this.oldestRevision != null
        ? Math.min(this.oldestRevision, change.revision)
        : change.revision;
  }

  clear() {
    this._changes = [];
    this.oldestRevision = null;
  }

  getRelevantDocumentValueProjection() {
    if (this.oldestRevision == null) return;

    const path = this.fieldPath;

    return {
      latestRevision: `$${path}.latestRevision`,
      latestText: `$${path}.latestText`,
      // Get records that are required to transform changes for latest document
      relevantRecords: {
        $slice: [
          `$${path}.records`,
          {
            // Only allow slicing records from end of array
            $min: [
              0,
              {
                $subtract: [this.oldestRevision, `$${path}.latestRevision`],
              },
            ],
          },
        ],
      },
    };
  }
}

export class MultiFieldDocumentServer<
  FieldName extends string,
  TSchema extends Document = Document,
> {
  private collection: Collection<TSchema>;

  private changesQueueMap = new Map<FieldName, FieldChanges<string>>();
  private _hasChanges = false;

  constructor(collection: Collection<TSchema>) {
    this.collection = collection;
  }

  queueChange(fieldPath: FieldName, change: RevisionChangeset) {
    let changes = this.changesQueueMap.get(fieldPath);
    if (!changes) {
      changes = new FieldChanges(fieldPath);
      this.changesQueueMap.set(fieldPath, changes);
    }
    changes.add(change);
    this._hasChanges = true;
  }

  getChanges(fieldPath: FieldName): Readonly<RevisionChangeset[]> | undefined {
    return this.changesQueueMap.get(fieldPath)?.changes;
  }

  hasChanges() {
    return this._hasChanges;
  }

  clearChangeQueue() {
    for (const field of this.changesQueueMap.values()) {
      field.clear();
    }
    this._hasChanges = false;
  }

  async findAllRelevantDocumentValues(
    filter: Filter<TSchema>,
    options?: UpdateOptions | undefined
  ) {
    const collection = this.collection;
    const documentFields = [...this.changesQueueMap.values()];

    const fieldProjections = Object.fromEntries(
      Object.values(documentFields).map((changeField) => [
        changeField.fieldPath,
        changeField.getRelevantDocumentValueProjection(),
      ])
    );

    return (
      await collection
        .aggregate<Record<string, RelevantDocumentValue>>(
          [
            {
              $match: filter,
            },
            {
              $project: {
                ...fieldProjections,
                _id: 0,
              },
            },
          ],
          options
        )
        .toArray()
    )[0];
  }

  /**
   * Calls {@link updateOneWithSession} with a transaction
   */
  async updateOneWithClient(
    client: MongoClient,
    filter: Filter<TSchema>,
    update?: UpdateFilter<TSchema>,
    options?: UpdateOptions | undefined
  ): Promise<Record<FieldName, RevisionChangeset[] | undefined>> {
    return await client.withSession(async (session) => {
      return await session.withTransaction(async (session) => {
        return this.updateOneWithSession(session, filter, update, options);
      });
    });
  }

  /**
   * Uses a transaction to read current records and update document accordingly with queued changes.
   * @returns Changes that have been modified to apply to latest document state.
   * These changes can be sent to other clients. Array is in queue insertion order.
   */
  async updateOneWithSession(
    session: ClientSession,
    filter: Filter<TSchema>,
    update?: UpdateFilter<TSchema>,
    options?: UpdateOptions | undefined
  ): Promise<Record<FieldName, RevisionChangeset[] | undefined>> {
    const collection = this.collection;
    const changesQueueMap = this.changesQueueMap;

    // Query for relevant records with document headtext
    const rawRelevantDocumentValues = await this.findAllRelevantDocumentValues(filter, {
      session,
    });

    if (!rawRelevantDocumentValues) {
      throw new MultiFieldDocumentServerError(
        MultiFieldDocumentServerErrorCode.DocumentNotFound
      );
    }

    const fieldsUpdateQuery = {
      $set: {},
      $push: {},
    } as {
      $set: MatchKeysAndValues<TSchema>;
      $push: PushOperator<TSchema>;
    };

    const changesResult = {} as Record<FieldName, RevisionChangeset[]>;

    for (const [path, rawRelevantDocumentValue] of Object.entries(
      rawRelevantDocumentValues
    )) {
      const fieldPath = path as FieldName;
      const field = changesQueueMap.get(fieldPath);
      if (!field) {
        continue;
      }

      // Create a changeset document server which can apply changes to headText
      const lastRecordIndex = rawRelevantDocumentValue.relevantRecords.length - 1;
      const documentServer = new DocumentServer({
        headText: {
          revision: rawRelevantDocumentValue.latestRevision,
          changeset: Changeset.fromInsertion(rawRelevantDocumentValue.latestText),
        },
        records: rawRelevantDocumentValue.relevantRecords.map((rawRecord) => ({
          ...rawRecord,
          changeset: Changeset.parseValue(rawRecord.changeset),
        })),
      });

      // Apply queued changes
      for (const change of field.changes) {
        try {
          const latestRecord = documentServer.addChange(change);
          if (!(fieldPath in changesResult)) {
            changesResult[fieldPath] = [];
          }
          changesResult[fieldPath].push(latestRecord);
        } catch (err) {
          throw new MultiFieldDocumentServerError(
            MultiFieldDocumentServerErrorCode.RecordMissing,
            {
              cause: err,
            }
          );
        }
      }

      // Add new document server state to database update query
      const newLatestRevision = documentServer.headText.revision;
      const newLatestText = documentServer.headText.changeset.joinInsertions();

      // Only push newly added records
      const newPushedRecords = documentServer.records
        .slice(lastRecordIndex + 1)
        .map((record) => ({
          ...record,
          changeset: record.changeset.serialize(),
        }));

      fieldsUpdateQuery.$set[`${fieldPath}.latestRevision`] =
        newLatestRevision as MatchKeysAndValues<TSchema>[`${FieldName}.latestRevision`];

      fieldsUpdateQuery.$set[`${fieldPath}.latestText`] =
        newLatestText as MatchKeysAndValues<TSchema>[`${FieldName}.latestText`];

      fieldsUpdateQuery.$push[`${fieldPath}.records`] = {
        $each: newPushedRecords,
      } as PushOperator<TSchema>[`${FieldName}.records`];
    }

    await collection.updateOne(
      filter,
      {
        ...update,
        $set: {
          ...update?.$set,
          ...fieldsUpdateQuery.$set,
        },
        $push: {
          ...update?.$push,
          ...fieldsUpdateQuery.$push,
        },
      },
      {
        ...options,
        session,
      }
    );

    // Clear queue as changes have been applied
    this.clearChangeQueue();

    return changesResult;
  }
}
