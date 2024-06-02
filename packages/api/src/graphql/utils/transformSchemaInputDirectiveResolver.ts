import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import {
  GraphQLFieldConfig,
  GraphQLInputFieldConfig,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLSchema,
  isNonNullType,
  isScalarType,
} from 'graphql';

function assertGetScalarType<
  F extends GraphQLFieldConfig<unknown, unknown> | GraphQLInputFieldConfig,
>(fieldConfig: F) {
  if (isNonNullType(fieldConfig.type) && isScalarType(fieldConfig.type.ofType)) {
    return fieldConfig.type.ofType;
  } else if (isScalarType(fieldConfig.type)) {
    return fieldConfig.type;
  } else {
    throw new Error(`Not a scalar type: ${fieldConfig.type.toString()}`);
  }
}

export type DirectiveTypeResolver<
  TParent extends GraphQLScalarType,
  TArgs extends Record<string, unknown>,
> = (parent: TParent, args: TArgs) => GraphQLOutputType;

/**
 * @param schema
 * @param directiveName
 * @param directiveResolver
 * @returns A new mapped schema that has invokes {@link directiveResolver} on {@link directiveName} directive.
 */
export default function transformSchemaInputDirectiveResolver<
  TArgs extends Record<string, unknown>,
>(
  schema: GraphQLSchema,
  directiveName: string,
  directiveResolver: DirectiveTypeResolver<GraphQLScalarType, TArgs>
): GraphQLSchema {
  const typeDirectiveArgumentMaps: Record<string, TArgs> = {};

  return mapSchema(schema, {
    [MapperKind.FIELD]: (fieldConfig, _fieldName, typeName, schema) => {
      const directive =
        getDirective(schema, fieldConfig, directiveName)?.[0] ??
        typeDirectiveArgumentMaps[typeName];

      if (!directive) return fieldConfig;

      const scalarType = assertGetScalarType(fieldConfig);
      fieldConfig.type = directiveResolver(scalarType, directive as TArgs);

      return fieldConfig;
    },
  });
}
