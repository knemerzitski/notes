import { GraphQLScalarType, Kind, ValueNode } from 'graphql/index.js';

import { Changeset as ChangesetClass } from '../../../../../../collab2/src';

// TODO move to bottom
function valueFromAST(value: ValueNode): string {
  if (value.kind === Kind.STRING) {
    return value.value;
  }

  throw new Error('Value must be a String');
}

export const Changeset = new GraphQLScalarType({
  name: 'Changeset',
  description: 'Changeset custom scalar type',
  serialize: (value) => {
    if (value instanceof ChangesetClass) {
      return value.serialize();
    }
    if (typeof value === 'string') {
      return ChangesetClass.parse(value).serialize();
    }

    throw new Error('Value must be either a Changeset instance or a String');
  },
  parseValue: (value) => {
    if (value instanceof ChangesetClass) {
      return value;
    }
    if (typeof value === 'string') {
      return ChangesetClass.parse(value);
    }

    throw new Error('Value must be either a Changeset instance or a String');
  },
  parseLiteral: (ast) => {
    return ChangesetClass.parse(valueFromAST(ast));
  },
});
