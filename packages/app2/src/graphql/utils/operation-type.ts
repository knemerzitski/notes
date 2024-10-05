import { getMainDefinition } from '@apollo/client/utilities';
import { DocumentNode, Kind, OperationTypeNode } from 'graphql';

export function getOperationKind(query: DocumentNode) {
  const definition = getMainDefinition(query);
  if (definition.kind !== Kind.OPERATION_DEFINITION) {
    return;
  }
  return definition.operation;
}

export function isQuery(query: DocumentNode) {
  return getOperationKind(query) === OperationTypeNode.QUERY;
}

export function isMutation(query: DocumentNode) {
  return getOperationKind(query) === OperationTypeNode.MUTATION;
}

export function isSubscription(query: DocumentNode) {
  return getOperationKind(query) === OperationTypeNode.SUBSCRIPTION;
}
