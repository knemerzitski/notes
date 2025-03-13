import { createMongoDBContext } from '../../../../../api/src/__tests__/helpers/mongodb/context';
import { CollectionName } from '../../../../../api/src/mongodb/collection-names';
import { DBSchema } from '../../../../../api/src/mongodb/collections';
import { strToObjectId } from '../../../../../api/src/mongodb/utils/objectid';

export type DBFindOneFn<T extends CollectionName> = (options: {
  id: string;
  collectionName: T;
}) => Promise<DBSchema[T]>;

export class MongoDBTasks {
  /**
   * Invoke as a singleton instance or commands will be overwritten by new instance.
   */
  setupNodeEvents(
    on: Cypress.PluginEvents,
    _config: Cypress.PluginConfigOptions
  ): Promise<Cypress.PluginConfigOptions | void> | Cypress.PluginConfigOptions | void {
    on('task', {
      resetDatabase: this.resetDatabase.bind(this),
      dbFindOne: this.dbFindOne.bind(this),
      expireUserSessions: this.expireUserSessions.bind(this),
    });
  }

  static async asyncConstructor(config: Cypress.PluginConfigOptions) {
    return {
      mongoDBCtx: await createMongoDBContext({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/dot-notation
        uri: config.env['DB_URI'],
      }),
    };
  }

  private readonly mongoDBCtx;

  constructor(
    asyncConstructor: Awaited<ReturnType<(typeof MongoDBTasks)['asyncConstructor']>>
  ) {
    this.mongoDBCtx = asyncConstructor.mongoDBCtx;
  }

  async resetDatabase() {
    return this.mongoDBCtx.resetDatabase();
  }

  async dbFindOne<T extends CollectionName>({
    id,
    collectionName,
  }: {
    id: string;
    collectionName: T;
  }): Promise<DBSchema[T]> {
    const collection = this.mongoDBCtx.mongoCollections[collectionName];

    const _id = strToObjectId(id);

    const document = await collection.findOne({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      _id: _id as any,
    });

    if (!document) {
      throw new Error(`Document "${id}" not found in collection "${collectionName}"`);
    }

    return document as DBSchema[T];
  }

  async expireUserSessions({ userId }: { userId: string }) {
    await this.mongoDBCtx.mongoCollections.sessions.deleteMany({
      userId: strToObjectId(userId),
    });

    return null;
  }
}
