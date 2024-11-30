import { GraphQLScalarType, Kind } from 'graphql/index.js';
import { ObjectId } from 'mongodb';
import {
  isObjectIdStr,
  objectIdToStr,
  strToObjectId,
} from '../../../../mongodb/utils/objectid';

function assertBase64StrLen16(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !isObjectIdStr(value)) {
    throw new Error('Value must be a base64 string of length 16');
  }
}

export const ObjectID = new GraphQLScalarType({
  name: 'ObjectID',
  description: 'A base64 string that can be converted to MongoDB ObjectID',
  serialize: (value) => {
    if (value instanceof ObjectId) {
      return objectIdToStr(value);
    }

    throw new Error('GraphQL ObjectId Scalar serializer expected a `ObjectId` object');
  },
  parseValue: (value) => {
    if (value instanceof ObjectId) {
      return value;
    }

    assertBase64StrLen16(value);

    return strToObjectId(value);
  },
  parseLiteral: (ast) => {
    switch (ast.kind) {
      case Kind.STRING:
        assertBase64StrLen16(ast.value);
        return strToObjectId(ast.value);
      default:
        throw new Error('Value must be a String');
    }
  },
});
