import {
  FieldNode,
  GraphQLOutputType,
  GraphQLResolveInfo,
  Kind,
  SelectionNode,
  isNonNullType,
  isObjectType,
} from 'graphql';
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
 *
 * @param source Object containing replaced fields
 * @param context Resolver context
 * @param info Resolver info
 * @param options
 * @returns Result of field execution
 */
export function customExecuteFields<TContext>(
  source: Record<string, unknown>,
  context: TContext,
  info: GraphQLResolveInfo,
  options?: ExecutionOptions
) {
  const exeContext = reuseExecutionContext({
    info: info,
    contextValue: context,
    options: {
      bubbleNull: true,
      ...options,
    },
  });

  const returnType = unwrapNonNullType(info.returnType);
  if (!isObjectType(returnType)) {
    return;
  }

  const selectionSet = info.fieldNodes[0]?.selectionSet;
  if (!selectionSet) return;

  const fieldNodes = selectionSet.selections.filter(isFieldNode);

  const executingFields: unknown[] = [];

  for (const name of Object.keys(source)) {
    const fieldNode = fieldNodes.find((fieldNode) => fieldNode.name.value === name);
    if (!fieldNode) continue;

    const fieldPath = addPath(info.path, name, returnType.name);

    executingFields.push(
      executeField(exeContext, returnType, source, [fieldNode], fieldPath)
    );
  }

  return Promise.all(executingFields);
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
