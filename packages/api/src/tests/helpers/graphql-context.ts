import { mockDeep, mockFn } from 'vitest-mock-extended';

import { GraphQLResolversContext } from '../../graphql/context';

import UserDocumentHelper from './model/UserDocumentHelper';
import { Note, Session, User, UserNote, connection } from './mongoose';

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
    publish: mockFn(),
  });

  const context: GraphQLResolversContext = {
    ...mockContext,
    mongoose: {
      ...mockContext.mongoose,
      connection: connection,
    },
  };
  return context;
}
