import { ClientSession, Collection, Db } from 'mongodb';

const COLLECTION_NAME = '_demo_config';

const ID = 'demo';

export interface ConfigSchema {
  readonly id: typeof ID;
  nextResetAt: Date;
}

export interface ConfigOptions {
  interval: number;
}

export class ConfigModel {
  static async create(db: Db, options: ConfigOptions) {
    const collection = db.collection<ConfigSchema>(COLLECTION_NAME);

    return new ConfigModel(
      (await collection.findOne<ConfigSchema>({
        id: ID,
      })) ?? {
        id: ID,
        nextResetAt: new Date(Date.now() + options.interval),
      },
      options,
      collection
    );
  }

  private constructor(
    private readonly data: ConfigSchema,
    private readonly options: ConfigOptions,
    private readonly collection: Collection<ConfigSchema>
  ) {}

  getNextResetAt() {
    return this.data.nextResetAt;
  }

  refreshNextResetAt() {
    this.data.nextResetAt = new Date(Date.now() + this.options.interval);
  }

  async save(session?: ClientSession) {
    await this.collection.updateOne(
      {
        id: ID,
      },
      {
        $set: {
          nextResetAt: this.data.nextResetAt,
        },
      },
      {
        upsert: true,
        session,
      }
    );
  }
}
