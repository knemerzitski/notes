import { getMainDefinition } from '@apollo/client/utilities';
import { DocumentNode, Kind } from 'graphql';

export function getOperationKind(query: DocumentNode) {
  const definition = getMainDefinition(query);
  if (definition.kind !== Kind.OPERATION_DEFINITION) {
    return;
  }
  return definition.operation;
}
