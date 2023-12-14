import { FieldNode, GraphQLResolveInfo, SelectionSetNode } from 'graphql';

import { Resolver } from '../../graphql/types.generated';

interface MockResolverWithResolve<TResult, TParent, TContext, TArgs> {
  resolve: MockResolverFn<TResult, TParent, TContext, TArgs>;
}

interface MockLegacyStitchingResolver<TResult, TParent, TContext, TArgs> {
  fragment: string;
  resolve: MockResolverFn<TResult, TParent, TContext, TArgs>;
}

interface MockNewStitchingResolver<TResult, TParent, TContext, TArgs> {
  selectionSet: string | ((fieldNode: FieldNode) => SelectionSetNode);
  resolve: MockResolverFn<TResult, TParent, TContext, TArgs>;
}
type MockStitchingResolver<TResult, TParent, TContext, TArgs> =
  | MockLegacyStitchingResolver<TResult, TParent, TContext, TArgs>
  | MockNewStitchingResolver<TResult, TParent, TContext, TArgs>;

export type MockResolver<TResult, TParent, TContext, TArgs> =
  | MockResolverFn<TResult, TParent, TContext, TArgs>
  | MockResolverWithResolve<TResult, TParent, TContext, TArgs>
  | MockStitchingResolver<TResult, TParent, TContext, TArgs>;

type MockResolverFn<TResult, TParent, TContext, TArgs> = (
  parent?: TParent,
  args?: TArgs,
  context?: TContext,
  info?: GraphQLResolveInfo
) => Promise<TResult> | TResult;

function isResolverFn<TResult, TParent, TContext, TArgs>(
  resolver: Resolver<TResult, TParent, TContext, TArgs>
): resolver is MockResolverFn<TResult, TParent, TContext, TArgs> {
  return !('resolve' in resolver);
}

function isLegacyStichingResolver<TResult, TParent, TContext, TArgs>(
  resolver: Resolver<TResult, TParent, TContext, TArgs>
): resolver is MockLegacyStitchingResolver<TResult, TParent, TContext, TArgs> {
  return 'fragment' in resolver && 'resolve' in resolver;
}

function isNewStichingResolver<TResult, TParent, TContext, TArgs>(
  resolver: Resolver<TResult, TParent, TContext, TArgs>
): resolver is MockNewStitchingResolver<TResult, TParent, TContext, TArgs> {
  return 'selectionSet' in resolver && 'resolve' in resolver;
}

function isResolverWithResolve<TResult, TParent, TContext, TArgs>(
  resolver: Resolver<TResult, TParent, TContext, TArgs>
): resolver is MockResolverWithResolve<TResult, TParent, TContext, TArgs> {
  return 'resolve' in resolver;
}

export function mockResolver<TResult, TParent, TContext, TArgs>(
  resolver: Resolver<TResult, TParent, TContext, TArgs>
): MockResolverFn<TResult, TParent, TContext, TArgs>;
export function mockResolver<TResult, TParent, TContext, TArgs>(
  resolver: Resolver<TResult, TParent, TContext, TArgs>,
  type: 'resolve'
): MockResolverWithResolve<TResult, TParent, TContext, TArgs>;
export function mockResolver<TResult, TParent, TContext, TArgs>(
  resolver: Resolver<TResult, TParent, TContext, TArgs>,
  type: 'stiching-new'
): MockNewStitchingResolver<TResult, TParent, TContext, TArgs>;
export function mockResolver<TResult, TParent, TContext, TArgs>(
  resolver: Resolver<TResult, TParent, TContext, TArgs>,
  type: 'stiching-legacy'
): MockLegacyStitchingResolver<TResult, TParent, TContext, TArgs>;
export function mockResolver<TResult, TParent, TContext, TArgs>(
  resolver: Resolver<TResult, TParent, TContext, TArgs>,
  type?: 'stiching-new' | 'stiching-legacy' | 'resolve'
): MockResolver<TResult, TParent, TContext, TArgs> {
  if (
    type === 'stiching-legacy' &&
    isLegacyStichingResolver<TResult, TParent, TContext, TArgs>(resolver)
  ) {
    return {
      fragment: resolver.fragment,
      resolve: (parent, args, context, info) =>
        resolver.resolve(parent, args, context, info),
    };
  } else if (
    type === 'stiching-new' &&
    isNewStichingResolver<TResult, TParent, TContext, TArgs>(resolver)
  ) {
    return {
      selectionSet: resolver.selectionSet,
      resolve: (parent, args, context, info) =>
        resolver.resolve(parent, args, context, info),
    };
  } else if (
    type === 'resolve' &&
    isResolverWithResolve<TResult, TParent, TContext, TArgs>(resolver)
  ) {
    return (parent, args, context, info) => resolver.resolve(parent, args, context, info);
  }

  if (isResolverFn<TResult, TParent, TContext, TArgs>(resolver)) {
    return (parent, args, context, info) => resolver(parent, args, context, info);
  }

  throw new Error('impossible');
}
