import { mockDeep } from 'vitest-mock-extended';

import { GraphQLResolversContext } from '../../graphql/context';

import UserDocumentHelper from './model/UserDocumentHelper';
import { Note, Session, User, UserNote, testConnection } from './mongoose';

export function createUserContext(userHelper: UserDocumentHelper) {
  const mockContext = mockDeep<GraphQLResolversContext>({
    auth: {
      session: {
        user: {
          _id: userHelper.user._id.toString('base64'),
        },
      },
    },
    mongoose: {
      model: {
        User,
        UserNote,
        Note,
        Session,
      },
    },
  });

  const context: GraphQLResolversContext = {
    ...mockContext,
    mongoose: {
      ...mockContext.mongoose,
      connection: testConnection,
    },
  };
  return context;
}
