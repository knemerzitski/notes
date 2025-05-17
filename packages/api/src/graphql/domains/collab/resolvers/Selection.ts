import { GraphQLScalarType, Kind, ValueNode } from 'graphql/index.js';

import { Selection as SelectionClass } from '../../../../../../collab2/src';

export const Selection = new GraphQLScalarType({
  name: 'Selection',
  description: 'Selection custom scalar type',
  serialize: (value) => {
    if (value instanceof SelectionClass) {
      return value.serialize();
    }
    if (typeof value === 'string') {
      return SelectionClass.parse(value).serialize();
    }

    throw new Error('Value must be either a Selection instance or a String');
  },
  parseValue: (value) => {
    if (value instanceof SelectionClass) {
      return value;
    }
    if (typeof value === 'string') {
      return SelectionClass.parse(value);
    }

    throw new Error('Value must be either a Selection instance or a String');
  },
  parseLiteral: (ast) => {
    return SelectionClass.parse(valueFromAST(ast));
  },
});

function valueFromAST(value: ValueNode): string {
  if (value.kind === Kind.STRING) {
    return value.value;
  }

  throw new Error('Value must be a String');
}
