import { GraphQLScalarType, Kind } from 'graphql';
import { ObjectId } from 'mongodb';

function assertBase64StrLen16(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !isObjectIdStr(value)) {
    throw new Error('Value must be a base64 string of length 16');
  }
}

export function strToObjectId(value: string | undefined): ObjectId | undefined;
export function strToObjectId(value: string): ObjectId;
export function strToObjectId(value: string | undefined) {
  if (!value) return;
  return ObjectId.createFromBase64(value);
}

export function objectIdToStr(id: ObjectId | undefined): string | undefined;
export function objectIdToStr(id: ObjectId): string;
export function objectIdToStr(id: ObjectId | undefined) {
  return id?.toString('base64');
}

export function isObjectIdStr(value: string): boolean {
  if (value.length !== 16) return false;
  return /^[A-Za-z0-9+/=]{16}$/.test(value);
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
