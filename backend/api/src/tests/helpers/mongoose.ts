import { createConnection } from 'mongoose';

import { createMongooseModels } from '../../schema/mongoose-schemas';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const DB_URI = process.env.TEST_MONGODB_URI!;

export const connection = await createConnection(DB_URI).asPromise();

export const model = createMongooseModels(connection);

export async function resetDatabase() {
  await connection.transaction(() => {
    return Promise.all([
      model.Note.deleteMany(),
      model.Session.deleteMany(),
      model.User.deleteMany(),
      model.UserNote.deleteMany(),
    ]);
  });
}
