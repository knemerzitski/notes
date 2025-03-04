import {
  NamedTypeMapper,
  getDirective,
  GenericFieldMapper,
  mapSchema,
  MapperKind,
} from '@graphql-tools/utils';
import {
  defaultFieldResolver,
  GraphQLFieldConfig,
  GraphQLResolveInfo,
  GraphQLSchema,
} from 'graphql/index.js';

import { ObjectId } from 'mongodb';

import { isObjectLike } from '../../../../../../utils/src/type-guards/is-object-like';
import { MaybePromise } from '../../../../../../utils/src/types';

import { GraphQLResolversContext } from '../../../types';
import { unwrapResolverMaybe } from '../../../utils/unwrap-resolver';
import type { authDirectiveArgs, NextResolverFn } from '../../types.generated';

export const auth: AuthDirectiveResolver = async (next, parent, args, ctx) => {
  const userIdDesc = args.directive.userId;

  // If no userId specified, find first available
  if (!userIdDesc) {
    await ctx.services.auth.assertAuthenticated();
    return next();
  }

  let targetObj: unknown;
  let targetPath: string;
  if (userIdDesc.parent) {
    targetObj = parent;
    targetPath = userIdDesc.parent;
  } else if (userIdDesc.args) {
    targetObj = args.field;
    targetPath = userIdDesc.args;
  } else {
    await ctx.services.auth.assertAuthenticated();
    return next();
  }

  const userId = await unwrapResolverMaybe(
    findMaybeUserIdBy(traverseObject(targetObj, targetPath.split('.')))
  );
  if (!isUserId(userId)) {
    throw new Error(
      `@auth directive failed to find user id for authentication. ` +
        `Path "${targetPath}" in value "${JSON.stringify(targetObj)}"`
    );
  }

  // Actual logic for authentication
  await ctx.services.auth.assertAuthenticated(userId);

  return next();
};

type AuthDirectiveResolver<
  TResult = unknown,
  TParent = unknown,
  TContext = GraphQLResolversContext,
  TArgs = {
    field: unknown;
    directive: authDirectiveArgs;
  },
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  ctx: TContext,
  info: GraphQLResolveInfo
) => MaybePromise<TResult>;

export function authTransform(schema: GraphQLSchema): GraphQLSchema {
  const directiveName = 'auth';
  const directiveResolver = auth;

  const typeDirectiveArgumentMaps: Record<string, Record<string, unknown>> = {};

  const typeMapper: NamedTypeMapper = (type) => {
    const directive = getDirective(schema, type, directiveName)?.[0];
    if (directive) {
      typeDirectiveArgumentMaps[type.name] = directive;
    }
    return type;
  };

  const objectFieldMapper: GenericFieldMapper<
    GraphQLFieldConfig<unknown, GraphQLResolversContext, unknown>
  > = (fieldConfig, _fieldName, typeName) => {
    const directiveArgs = (getDirective(schema, fieldConfig, directiveName)?.[0] ??
      typeDirectiveArgumentMaps[typeName]) as authDirectiveArgs | undefined;

    if (!directiveArgs) {
      return fieldConfig;
    }

    const { resolve = defaultFieldResolver } = fieldConfig;

    fieldConfig.resolve = (source, args, ctx, info) => {
      const next: NextResolverFn<unknown> = async () => {
        return Promise.resolve(resolve(source, args, ctx, info));
      };

      return directiveResolver(
        next,
        source,
        {
          field: args,
          directive: directiveArgs,
        },
        ctx,
        info
      );
    };

    return fieldConfig;
  };

  return mapSchema(schema, {
    [MapperKind.TYPE]: typeMapper,
    [MapperKind.OBJECT_FIELD]: objectFieldMapper,
  });
}

function traverseObject(obj: unknown, path: string[]): unknown {
  const key = path[0];
  if (key === undefined) {
    return obj;
  }

  if (!isObjectLike(obj)) {
    return;
  }

  return traverseObject(obj[key], path.slice(1));
}

function isUserId(value: unknown): value is string | ObjectId {
  return typeof value === 'string' || value instanceof ObjectId;
}

function findMaybeUserIdBy(value: unknown) {
  if (isUserId(value)) {
    return value;
  }

  if (isObjectLike(value)) {
    const firstKey = Object.keys(value)[0];
    if (!firstKey) {
      return;
    }

    return value[firstKey];
  }

  return;
}
