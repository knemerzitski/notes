import { GraphQLScalarType, GraphQLSchema } from 'graphql';

import { lengthDirectiveArgs } from '../../types.generated';
import transformSchemaInputDirectiveResolver from '../../utils/transformSchemaInputDirectiveResolver';

export class MaxLengthType extends GraphQLScalarType {
  constructor(type: GraphQLScalarType, args: lengthDirectiveArgs) {
    const maybeMax = args.max;
    if (maybeMax == null) {
      super(type);
      return;
    }

    const max = maybeMax;

    function assertMaxLength(value: unknown) {
      if (countLength(value, max) > max) {
        throw new Error(`Expected to have at most length ${args.max}`);
      }
    }

    super({
      name: `${type.name}LengthMax${max}`,
      description: `${type.description} @length(max: ${max})`,
      serialize: (value) => {
        const serializedValue = type.serialize(value);
        assertMaxLength(serializedValue);
        return serializedValue;
      },
      parseValue: (value) => {
        assertMaxLength(value);
        return type.parseValue(value);
      },
      parseLiteral: (ast) => {
        const value = type.parseLiteral(ast);
        assertMaxLength(type.serialize(value));
        return value;
      },
    });
  }
}

function countLength(value: unknown, limit: number) {
  if (value == null) return 0;

  if (typeof value == 'string') {
    return value.length;
  } else if (typeof value === 'number') {
    return 1;
  } else if (typeof value === 'object') {
    let sum = 0;
    for (const e of Object.values(value)) {
      sum += countLength(e, limit);
      if (sum > limit) {
        return sum;
      }
    }
    return sum;
  }

  return 0;
}

const lengthTypes: Record<string, Record<string, GraphQLScalarType>> = {};

function getLengthType(
  type: GraphQLScalarType,
  args: lengthDirectiveArgs
): GraphQLScalarType {
  const argsKey = JSON.stringify(args);
  let lengthTypesByTypename = lengthTypes[type.name];
  if (!lengthTypesByTypename) {
    lengthTypesByTypename = {};
  }

  let newType = lengthTypesByTypename[argsKey];
  if (!newType) {
    newType = new MaxLengthType(type, args);
    lengthTypesByTypename[argsKey] = newType;
  }
  return newType;
}

export function lengthTransform(schema: GraphQLSchema): GraphQLSchema {
  return transformSchemaInputDirectiveResolver(schema, 'length', getLengthType);
}
