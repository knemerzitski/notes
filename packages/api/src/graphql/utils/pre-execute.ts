import { ExecutionContext, ExecutionOptions } from 'graphql/execution/execute.js';
import {
  GraphQLResolveInfo,
  isObjectType,
  defaultFieldResolver,
  defaultTypeResolver,
  GraphQLOutputType,
  isNonNullType,
  isListType,
  SelectionNode,
  FieldNode,
  Kind,
  isUnionType,
  GraphQLObjectType,
  executeField,
} from 'graphql/index.js';
import { addPath } from 'graphql/jsutils/Path.js';
import { isObjectLike } from '~utils/type-guards/is-object-like';

export type PreFetchArrayUpdateSizeFn = (size: number | undefined) => void;

export type PreFetchedArrayGetItemFn<TValue> = (
  index: number,
  updateSize?: PreFetchArrayUpdateSizeFn
) => TValue;

/**
 * List type requires it's size to be known before child resolvers are called.
 * Query building logic for database fetch is inside child resolvers. \
 * Paradox: Don't know list size without querying <=> Can't query without knowing which fields are required.
 *
 * This function does the following:
 * 1. Call child resolvers as if list type has a single child element
 * which allows query to be built and data fetched.
 * 2. Return values with correct list size.
 *
 * @param getItem Get a single item from list. During query building, index is 0.
 * @param context GraphQL Context
 * @param info Info of the the list type field
 * @returns A list of items with pre-fetched size.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export async function withPreExecuteList<TContext, TValue>(
  getItem: PreFetchedArrayGetItemFn<TValue>,
  context: TContext,
  info: GraphQLResolveInfo
): Promise<TValue[]> {
  const returnType = unwrapNonNullType(
    unwrapListType(unwrapNonNullType(info.returnType))
  );

  if (!isObjectType(returnType)) {
    return [];
  }

  const selectionSet = info.fieldNodes[0]?.selectionSet;
  if (!selectionSet) return [];

  const exeContext = reuseExecutionContext({
    info: info,
    contextValue: context,
    options: {
      bubbleNull: true,
    },
  });

  let fetchedSize: number | undefined;
  function updateSize(newSize: number | undefined) {
    fetchedSize = fetchedSize ?? newSize;
  }
  const item = getItem(0, updateSize);

  const fieldNodes = selectionSet.selections.filter(isFieldNode);

  await Promise.allSettled(
    fieldNodes.map((fieldNode) =>
      executeField(
        exeContext,
        returnType,
        item,
        [fieldNode],
        addPath(info.path, fieldNode.name.value, returnType.name)
      )
    )
  );

  if (!fetchedSize) return [];

  return [...new Array<undefined>(fetchedSize)].map((_, index) =>
    getItem(index, updateSize)
  );
}

/**
 * Executes child resolvers for current field while ignoring null errors. Current field must return an object.
 * Can be used to to early build queries for loaders.
 *
 * @param source Value normally returned in resolver
 * @param context GraphQL Context
 * @param info Field info
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export async function preExecuteObjectField<TContext, TValue>(
  source: TValue,
  context: TContext,
  info: GraphQLResolveInfo
): Promise<TValue | undefined> {
  const returnType = findObjectTypeForSource(source, info.returnType);
  if (!returnType) {
    return;
  }

  const selectionSet = info.fieldNodes[0]?.selectionSet;
  if (!selectionSet) return;

  const fieldNodes = findFieldNodesForType(returnType, selectionSet.selections);

  const exeContext = reuseExecutionContext({
    info: info,
    contextValue: context,
    options: {
      bubbleNull: true,
    },
  });

  await Promise.allSettled(
    fieldNodes.map((fieldNode) =>
      executeField(
        exeContext,
        returnType,
        source,
        [fieldNode],
        addPath(info.path, fieldNode.name.value, returnType.name)
      )
    )
  );

  return source;
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function reuseExecutionContext<TContext>(args: {
  info: Pick<
    GraphQLResolveInfo,
    'schema' | 'rootValue' | 'operation' | 'fragments' | 'variableValues'
  >;
  contextValue: TContext;
  options?: ExecutionOptions;
}): ExecutionContext {
  const {
    info: { schema, rootValue, variableValues, fragments, operation },
    contextValue,
    options,
  } = args;

  return {
    schema,
    fragments,
    rootValue,
    contextValue,
    operation,
    variableValues,
    fieldResolver: defaultFieldResolver,
    typeResolver: defaultTypeResolver,
    subscribeFieldResolver: defaultFieldResolver,
    errors: [],
    options,
  };
}

function unwrapNonNullType(type: GraphQLOutputType) {
  return isNonNullType(type) ? type.ofType : type;
}

function unwrapListType(type: GraphQLOutputType) {
  return isListType(type) ? type.ofType : type;
}

function isFieldNode(selection: SelectionNode): selection is FieldNode {
  return selection.kind === Kind.FIELD;
}

function getTypeName(value: unknown): string | undefined {
  if (!isObjectLike(value)) return;
  if (typeof value.__typename !== 'string') return;
  return value.__typename;
}

function findObjectTypeForSource(
  source: unknown,
  type: GraphQLOutputType
): GraphQLObjectType | undefined {
  if (isObjectType(type)) {
    return type;
  }

  if (isNonNullType(type)) {
    return findObjectTypeForSource(source, type.ofType);
  }

  if (isUnionType(type)) {
    const __typename = getTypeName(source);
    if (!__typename) return;
    const unionTypes = type.getTypes();
    const matchingType = unionTypes.find((type) => type.name === __typename);
    if (!matchingType) return;

    return findObjectTypeForSource(source, matchingType);
  }

  return;
}

function findFieldNodesForType(
  type: GraphQLObjectType,
  selectionSet: readonly SelectionNode[]
): readonly FieldNode[] {
  const fieldNodes: FieldNode[] = [];

  const relevantTypes = new Set([type.name, ...type.getInterfaces().map((t) => t.name)]);

  for (const selection of selectionSet) {
    switch (selection.kind) {
      case Kind.FIELD:
        fieldNodes.push(selection);
        continue;
      case Kind.INLINE_FRAGMENT:
        if (selection.typeCondition?.kind !== Kind.NAMED_TYPE) continue;
        if (!relevantTypes.has(selection.typeCondition.name.value)) continue;

        fieldNodes.push(
          ...findFieldNodesForType(type, selection.selectionSet.selections)
        );

        continue;
    }
  }

  return fieldNodes;
}
