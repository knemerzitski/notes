import {
  ASTNode,
  GraphQLError,
  GraphQLField,
  GraphQLResolveInfo,
  getArgumentValues,
} from 'graphql';
import { collectFields } from 'graphql/execution/collectFields';
import { ExecutionContext, buildResolveInfo, getFieldDef } from 'graphql/execution/execute';
import { Maybe } from 'graphql/jsutils/Maybe';
import { addPath } from 'graphql/jsutils/Path';

interface ResolverArgs {
  field: Maybe<GraphQLField<unknown, unknown>>;
  parent: ASTNode | null;
  args: {
    [variable: string]: unknown;
  };
  contextValue: unknown;
  info: GraphQLResolveInfo;
}

export function getResolverArgs(execContext: ExecutionContext): ResolverArgs {
  const { schema, fragments, operation, variableValues, contextValue } = execContext;

  const rootType = schema.getSubscriptionType();
  if (!rootType) {
    throw new GraphQLError('Schema cannot execute subscription operation.', {
      nodes: operation,
    });
  }

  const rootFields = collectFields(
    schema,
    fragments,
    variableValues,
    rootType,
    operation.selectionSet
  );
  const [responseName, fieldNodes] = [...rootFields.entries()][0];
  const field = getFieldDef(schema, rootType, fieldNodes[0]);

  if (!field) {
    const fieldName = fieldNodes[0].name.value;
    throw new GraphQLError(`Subscription field "${fieldName}" is not defined.`, {
      nodes: fieldNodes,
    });
  }

  const args = getArgumentValues(field, fieldNodes[0], variableValues);

  const path = addPath(undefined, responseName, rootType.name);
  const info = buildResolveInfo(execContext, field, fieldNodes, rootType, path);

  return {
    field,
    parent: null,
    args,
    contextValue,
    info,
  };
}
