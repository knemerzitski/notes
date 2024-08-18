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
} from 'graphql';
import { ExecutionContext } from 'graphql/execution/execute';
import { addPath } from 'graphql/jsutils/Path';
import { executeField, ExecutionOptions } from './graphql/execute';

export type PreFetchArrayUpdateSizeFn = (size: number | undefined) => void;

export type PreFetchedArrayGetItemFn<TValue> = (
  index: number,
  updateSize: PreFetchArrayUpdateSizeFn
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
export async function withPreFetchedArraySize<TContext, TValue>(
  getItem: PreFetchedArrayGetItemFn<TValue>,
  context: TContext,
  info: GraphQLResolveInfo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
