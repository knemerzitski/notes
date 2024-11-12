import { GraphQLScalarType, Kind, ValueNode } from 'graphql/index.js';
import { Changeset as ChangesetClass } from '~collab/changeset';

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
    if (value instanceof ChangesetClass) {
      return value.serialize();
    }
    return ChangesetClass.parseValue(value).serialize();
  },
  parseValue: (value) => {
    if (value instanceof ChangesetClass) {
      return value;
    }
    return ChangesetClass.parseValue(value);
  },
  parseLiteral: (ast) => {
    return ChangesetClass.parseValue(valueFromAST(ast));
  },
});
