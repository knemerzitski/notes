import { ClientSession, Collection, Db } from 'mongodb';

const COLLECTION_NAME = 'config';

const ID = 'demo';

interface Schema {
  readonly id: typeof ID;
  resetAt: Date;
}

interface Data extends Schema {
  demoEnabled: boolean;
}

interface ConfigOptions {
  /**
   * In milliseconds how often demo data should be reset
   */
  resetInterval: number;
}

/**
 * Used to keep track of if and when to reset database demo data
 */
export class ConfigModel {
  static async create(db: Db, options: ConfigOptions) {
    const collection = db.collection<Data>(COLLECTION_NAME);

    return new ConfigModel(
      await collection.findOne<Schema>({
        id: ID,
      }),
      options,
      collection
    );
  }

  private dbData: Schema | null;

  private resetAt: Date;

  private constructor(
    dbData: Schema | null,
    private readonly options: ConfigOptions,
    private readonly collection: Collection<Data>
  ) {
    this.dbData = dbData;

    this.resetAt = dbData === null ? this.getNextResetAtValue() : dbData.resetAt;
  }

  getResetAt() {
    return this.resetAt;
  }

  refreshResetAt() {
    this.resetAt = this.getNextResetAtValue();
  }

  async save(session?: ClientSession) {
    if (!this.hasDBDataChanged()) {
      return;
    }

    await this.collection.updateOne(
      {
        id: ID,
      },
      {
        $set: {
          resetAt: this.resetAt,
        },
      },
      {
        upsert: true,
        session,
      }
    );

    this.dbData = {
      id: ID,
      resetAt: this.resetAt,
    };
  }

  async delete(session?: ClientSession) {
    if (!this.isDatabaseSeeded()) {
      return;
    }

    await this.collection.deleteOne(
      {
        id: ID,
      },
      {
        session,
      }
    );

    this.dbData = null;
  }

  isDatabaseSeeded() {
    return this.dbData !== null;
  }

  private hasDBDataChanged() {
    return this.dbData?.resetAt.getTime() !== this.resetAt.getTime();
  }

  private getNextResetAtValue() {
    return new Date(Date.now() + this.options.resetInterval);
  }
}
