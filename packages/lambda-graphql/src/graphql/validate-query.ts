import { DocumentNode, GraphQLError, GraphQLSchema, validate } from 'graphql/index.js';
import { assertValidExecutionArguments } from 'graphql/execution/execute.js';

export function validateQuery({
  schema,
  document,
  variables,
}: {
  schema: GraphQLSchema;
  document: DocumentNode;
  variables?: Record<string, unknown> | null;
}): readonly GraphQLError[] | undefined {
  const errors = validate(schema, document);

  if (errors.length > 0) {
    return errors;
  }

  try {
    assertValidExecutionArguments(schema, document, variables);
  } catch (e) {
    return [e as GraphQLError];
  }

  return;
}
