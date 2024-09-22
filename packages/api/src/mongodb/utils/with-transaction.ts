import {
  ClientSession,
  MongoClient,
  ClientSessionOptions,
  TransactionOptions,
} from 'mongodb';

type WithTransactionCallback<T> = (ctx: TransactionContext) => Promise<T>;

export interface TransactionContext {
  /**
   * Run a operation single at a time. Do not put multiple
   * operations in a single call. Simply call this function multiple times.
   *
   * Ensures that transaction will not have any conflicts since first operation
   * has to be run synchronously.
   *
   * @returns Promise that returns when operation has finished.
   */
  runSingleOperation: <T>(run: RunOperationCallback<T>) => Promise<T>;
  session: ClientSession;
}

type RunOperationCallback<T> = (session?: ClientSession) => Promise<T>;

export async function withTransaction<T>(
  mongoClient: MongoClient,
  executor: WithTransactionCallback<T>,
  options?: {
    /**
     * @default false
     */
    skipAwaitFirstOperation?: boolean;
    session?: ClientSessionOptions;
    transaction?: TransactionOptions;
  }
) {
  return mongoClient.withSession(options?.session ?? {}, (session) => {
    let firstOperation: 'empty' | Promise<unknown> | 'done' = 'empty';

    const ctx: TransactionContext = {
      session,
      runSingleOperation: async (run) => {
        if (firstOperation instanceof Promise) {
          if (!options?.skipAwaitFirstOperation) {
            await firstOperation;
          }
          firstOperation = 'done';
        }

        const op = run(session);

        if (firstOperation === 'empty') {
          firstOperation = op;
        }

        return op;
      },
    };

    return session.withTransaction(() => executor(ctx), options?.transaction);
  });
}
