import {
  FieldNode,
  SelectionSetNode,
  FragmentSpreadNode,
  Kind,
  OperationDefinitionNode,
} from 'graphql/index';

export function operationDefinitionFragmentPaths(
  operation: OperationDefinitionNode
): FragmentPaths {
  return selectionSet(operation.selectionSet);
}

interface FindFragmentPathsContext {
  path: string[];
}

export type FragmentPaths = { fragmentName: string; path: string[] }[];

const findFragmentFnByKind = {
  [Kind.FIELD]: field,
  [Kind.SELECTION_SET]: selectionSet,
  [Kind.FRAGMENT_SPREAD]: fragmentSpread,
  [Kind.INLINE_FRAGMENT]: empty,
};

function empty() {
  return [];
}

function selectionSet(
  selectionSet: SelectionSetNode,
  ctx: FindFragmentPathsContext = { path: [] }
): FragmentPaths {
  const result: FragmentPaths = [];

  for (const selection of selectionSet.selections) {
    const fn = findFragmentFnByKind[selection.kind];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    result.push(...fn(selection as any, ctx));
  }

  return result;
}

function field(
  node: FieldNode,
  ctx: FindFragmentPathsContext = { path: [] }
): FragmentPaths {
  if (node.selectionSet) {
    return selectionSet(node.selectionSet, {
      ...ctx,
      path: [...ctx.path, node.name.value],
    });
  }

  return [];
}

function fragmentSpread(
  node: FragmentSpreadNode,
  ctx: FindFragmentPathsContext = { path: [] }
): FragmentPaths {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  node.name.value;

  return [
    {
      fragmentName: node.name.value,
      path: ctx.path,
    },
  ];
}
