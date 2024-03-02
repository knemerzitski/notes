import { GraphQLScalarType, Kind, ValueNode } from 'graphql';

import { Changeset as ChangesetScalar } from '~collab/changeset/changeset';

function valueFromAST(value: ValueNode): unknown {
  if (value.kind === Kind.LIST) {
    return value.values.map((value) => valueFromAST(value));
  } else if (value.kind === Kind.STRING) {
    return value.value;
  } else if (value.kind === Kind.INT) {
    return Number.parseInt(value.value);
  }
  return null;
}

export const Changeset = new GraphQLScalarType({
  name: 'Changeset',
  description: 'Changeset custom scalar type',
  serialize: (value) => {
    if (value instanceof ChangesetScalar) {
      return value.serialize();
    }

    throw new Error('GraphQL Changeset Scalar serializer expected a `Changeset` object');
  },
  parseValue: (value) => {
    if (value instanceof ChangesetScalar) {
      return value;
    }
    return ChangesetScalar.parseValue(value);
  },
  parseLiteral: (ast) => {
    return ChangesetScalar.parseValue(valueFromAST(ast));
  },
});
