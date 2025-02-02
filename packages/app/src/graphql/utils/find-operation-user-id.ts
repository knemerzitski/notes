import { DocumentNode, Operation } from '@apollo/client';
import {
  createFragmentMap,
  FragmentMap,
  getFragmentDefinitions,
  getMainDefinition,
  isMutationOperation,
  isQueryOperation,
  isSubscriptionOperation,
} from '@apollo/client/utilities';
import {
  ArgumentNode,
  FieldNode,
  Kind,
  SelectionSetNode,
  ValueNode,
} from 'graphql/index';
import { string, type } from 'superstruct';

type MyOperation = Pick<Operation, 'query' | 'variables'>;

interface Context {
  targetPath?: readonly (string | number)[];
  operation: MyOperation;
}

export function findOperationUserIds(
  operation: MyOperation,
  targetPath?: readonly (string | number)[]
): string[] {
  if (targetPath) {
    const userId = processDocumentNode(operation.query, {
      operation,
      targetPath,
    })[0];
    if (userId) {
      return [userId];
    }
    return [];
  }

  return processDocumentNode(operation.query, {
    operation,
  });
}

function processDocumentNode(document: DocumentNode, ctx: Context): string[] {
  const mainDefinition = getMainDefinition(document);

  return processSelectionSet(mainDefinition.selectionSet, ctx);
}

function processSelectionSet(selectionSet: SelectionSetNode, ctx: Context): string[] {
  if (ctx.targetPath != null && ctx.targetPath.length === 0) {
    return [];
  }

  const userIds: string[] = [];
  const targetFieldName = ctx.targetPath?.[0];

  for (const selection of selectionSet.selections) {
    if (selection.kind == Kind.FIELD) {
      const name = selection.name.value;
      if (selection.arguments) {
        const userId = processArguments(selection.arguments, selection, ctx);
        if (userId) {
          if (name === targetFieldName) {
            return [userId];
          }

          userIds.push(userId);
        }
      }

      if (selection.selectionSet) {
        const pushUserIds = processSelectionSet(selection.selectionSet, {
          ...ctx,
          targetPath: name === targetFieldName ? ctx.targetPath?.slice(1) : undefined,
        });
        if (name === targetFieldName) {
          return pushUserIds;
        }

        userIds.push(...pushUserIds);
      }
    } else if (selection.kind == Kind.FRAGMENT_SPREAD) {
      const fragemntName = selection.name.value;
      const fragment = findFragment(fragemntName, ctx);

      if (fragment) {
        userIds.push(...processSelectionSet(fragment.selectionSet, ctx));
      } else {
        throw new Error('Not implemented');
      }
    } else {
      userIds.push(...processSelectionSet(selection.selectionSet, ctx));
    }
  }

  return userIds;
}

const fragmentMap: FragmentMap = {};

function findFragment(fragmentName: string, ctx: Context) {
  let fragment = fragmentMap[fragmentName];
  if (!fragment) {
    const fragmentDefinition = getFragmentDefinitions(ctx.operation.query);
    const newFragmentMap = createFragmentMap(fragmentDefinition);

    fragment = newFragmentMap[fragmentName];

    Object.entries(newFragmentMap).forEach(([key, value]) => {
      fragmentMap[key] = value;
    });
  }

  return fragment;
}

function processArguments(
  args: readonly ArgumentNode[],
  field: FieldNode,
  ctx: Context
): string | undefined {
  for (const arg of args) {
    const userId = processArgument(arg, field, ctx);
    if (userId) {
      return userId;
    }
  }

  return;
}

// look for type SignedInUserByInput... instead of anything else?

function processArgument(
  arg: ArgumentNode,
  field: FieldNode,
  ctx: Context
): string | undefined {
  if (
    (isMutationOperation(ctx.operation.query) ||
      isSubscriptionOperation(ctx.operation.query)) &&
    arg.name.value === 'input'
  ) {
    const value = arg.value;
    if (value.kind === Kind.VARIABLE) {
      const variableName = value.name.value;
      const variableValue: unknown = ctx.operation.variables[variableName];

      const userId = findVariableMutationArgumentUserId(variableValue);

      return userId;
    } else {
      return findInlineValue(value, ['authUser', 'id']);
    }
  } else if (
    isQueryOperation(ctx.operation.query) &&
    (arg.name.value === 'userBy' ||
      (arg.name.value === 'by' && /.*signedinuser.*/i.exec(field.name.value)))
  ) {
    const value = arg.value;
    if (value.kind === Kind.VARIABLE) {
      const variableName = value.name.value;
      const variableValue: unknown = ctx.operation.variables[variableName];

      const userId = findVariableQueryArgumentUserId(variableValue);

      return userId;
    } else {
      return findInlineValue(value, ['id']);
    }
  }

  // Ignore other arguments
  return;
}

function findInlineValue(value: ValueNode, path: string[]): string | undefined {
  if (value.kind === Kind.STRING) {
    return value.value;
  }

  if (value.kind === Kind.OBJECT) {
    const key = path[0];
    if (!key) {
      throw new Error(`Unexpectd missing path for value ${JSON.stringify(value)}`);
    }

    for (const field of value.fields) {
      if (field.name.value === key) {
        return findInlineValue(field.value, path.slice(1));
      }
    }

    throw new Error(
      `Unexpected missing path ${path.join('.')} in value ${JSON.stringify(value)}`
    );
  }

  throw new Error('Not implemented');
}

const QueryUserByStruct = type({
  id: string(),
});
function findVariableQueryArgumentUserId(value: unknown): string {
  const [error, validatedValue] = QueryUserByStruct.validate(value);
  if (error) {
    throw error;
  }

  return validatedValue.id;
}

const MutationInputStruct = type({
  authUser: type({
    id: string(),
  }),
});
function findVariableMutationArgumentUserId(value: unknown): string | undefined {
  const [error, validatedValue] = MutationInputStruct.validate(value);
  if (error) {
    return;
  }

  return validatedValue.authUser.id;
}
