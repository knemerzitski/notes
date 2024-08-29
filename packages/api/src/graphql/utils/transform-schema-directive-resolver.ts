import {
  getDirective,
  MapperKind,
  mapSchema,
  GenericFieldMapper,
  NamedTypeMapper,
} from '@graphql-tools/utils';
import { GraphQLFieldConfig, GraphQLSchema, defaultFieldResolver } from 'graphql';

import { DirectiveResolverFn, NextResolverFn } from '../domains/types.generated';

/**
 * @param schema
 * @param directiveName
 * @param directiveResolver
 * @returns A new mapped schema that has invokes {@link directiveResolver} on {@link directiveName} directive.
 */
export function transformSchemaDirectiveResolver<TSource, TContext, TArgs>(
  schema: GraphQLSchema,
  directiveName: string,
  directiveResolver: DirectiveResolverFn<unknown, TSource, TContext, TArgs>
): GraphQLSchema {
  const typeDirectiveArgumentMaps: Record<string, TArgs> = {};

  const typeMapper: NamedTypeMapper = (type) => {
    const directive = getDirective(schema, type, directiveName)?.[0] as TArgs;
    if (directive) {
      typeDirectiveArgumentMaps[type.name] = directive;
    }
    return type;
  };

  const objectFieldMapper: GenericFieldMapper<
    GraphQLFieldConfig<TSource, TContext, TArgs>
  > = (fieldConfig, _fieldName, typeName) => {
    const directive =
      (getDirective(schema, fieldConfig, directiveName)?.[0] as TArgs) ??
      typeDirectiveArgumentMaps[typeName];

    if (!directive) return fieldConfig;

    const { resolve = defaultFieldResolver } = fieldConfig;

    fieldConfig.resolve = (source, args, ctx, info) => {
      const next: NextResolverFn<unknown> = async () => {
        return Promise.resolve(resolve(source, args, ctx, info));
      };
      return directiveResolver(next, source, directive, ctx, info);
    };

    return fieldConfig;
  };

  return mapSchema(schema, {
    [MapperKind.TYPE]: typeMapper,
    [MapperKind.OBJECT_FIELD]: objectFieldMapper,
  });
}
