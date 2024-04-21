import { GraphQLResolversContext } from '../../graphql/context';
import { vi } from 'vitest';
import { Publisher } from '~lambda-graphql/pubsub/publish';
import NotesDataSource from '../../graphql/note/datasource/notes-datasource';
import { UserSchema } from '../../mongodb/schema/user';
import { mongoCollections, mongoClient } from './mongodb';

export function createUserContext(
  user: Pick<UserSchema, '_id'>,
  publisher = (_ctx: Omit<GraphQLResolversContext, 'publish'>) => vi.fn() as Publisher
): GraphQLResolversContext {
  const ctx = {
    auth: {
      session: {
        user: {
          _id: user._id,
        },
      },
    },
    datasources: {
      notes: new NotesDataSource({
        mongodb: {
          collections: mongoCollections,
        },
      }),
    },
    mongodb: {
      collections: mongoCollections,
      client: mongoClient,
    },
  } as Omit<GraphQLResolversContext, 'publish'>;

  return {
    ...ctx,
    publish: publisher(ctx),
  };
}
