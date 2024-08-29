import { GraphQLScalarType, Kind } from 'graphql';

function assertStringOrInt(value: unknown): asserts value is string | number {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error('Value must be either a String or an Int');
  }

  if (typeof value === 'number' && !Number.isInteger(value)) {
    throw new Error('Number value must be an Int');
  }
}

export const Cursor = new GraphQLScalarType({
  name: 'Cursor',
  description: 'Relay connection cursor. Either a string or number.',
  serialize: (value) => {
    assertStringOrInt(value);
    return value;
  },
  parseValue: (value) => {
    assertStringOrInt(value);
    return value;
  },
  parseLiteral: (ast) => {
    switch (ast.kind) {
      case Kind.INT:
        return parseInt(ast.value);
      case Kind.STRING:
        return ast.value;
      default:
        throw new Error('Value must be either a String or an Int');
    }
  },
});
