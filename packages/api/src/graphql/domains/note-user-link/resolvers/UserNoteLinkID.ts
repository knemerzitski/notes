import { GraphQLScalarType, Kind } from 'graphql';
import { UserNoteLinkId } from '../../../../services/note/user-note-link-id';

export const UserNoteLinkID = new GraphQLScalarType({
  name: 'UserNoteLinkID',
  description: 'A string that contains id of both user and note',
  serialize: (value) => {
    if (value instanceof UserNoteLinkId) {
      return value.serialize();
    }

    throw new Error(
      'GraphQL UserNoteLinkID Scalar serializer expected a `UserNoteLinkId` object'
    );
  },
  parseValue: (value) => {
    return UserNoteLinkId.parseValue(value);
  },
  parseLiteral: (ast) => {
    switch (ast.kind) {
      case Kind.STRING:
        return UserNoteLinkId.parseValue(ast.value);
      default:
        throw new Error('Value must be a String');
    }
  },
});
