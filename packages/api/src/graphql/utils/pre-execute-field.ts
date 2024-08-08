import {
  FieldNode,
  GraphQLOutputType,
  GraphQLResolveInfo,
  Kind,
  SelectionNode,
  isNonNullType,
  isObjectType,
} from 'graphql';
import { collectSubfields as _collectSubfields } from 'graphql/execution/collectFields';
import {
  ExecutionContext,
  defaultFieldResolver,
  defaultTypeResolver,
} from 'graphql/execution/execute';
import { addPath } from 'graphql/jsutils/Path';

import { ExecutionOptions, executeField } from './graphql/execute';

/**
 * Executes a field without triggering any errors about cannot return null in a non-nullable field.
 *
 * Useful for query building in a field which returns list type but count is not known until
 * data is fetched. Build the whole query and do a single fetch with dataloader.
 */
export function preExecuteField<TContext>(
  fieldName: string,
  context: TContext,
  parentInfo: GraphQLResolveInfo,
  source: unknown,
  options?: ExecutionOptions
) {
  const exeContext = reuseExecutionContext({
    info: parentInfo,
    contextValue: context,
    options: {
      bubbleNull: true,
      ...options,
    },
  });

  const parentType = unwrapNonNullType(parentInfo.returnType);
  if (!isObjectType(parentType)) {
    return;
  }

  const selectionSet = parentInfo.fieldNodes[0]?.selectionSet;
  if (!selectionSet) return;

  const fieldNodes = selectionSet.selections.filter(isFieldNode);

  const fieldPath = addPath(parentInfo.path, fieldName, parentType.name);

  return executeField(exeContext, parentType, source, fieldNodes, fieldPath);
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

function isFieldNode(selection: SelectionNode): selection is FieldNode {
  return selection.kind === Kind.FIELD;
}
