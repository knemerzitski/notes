import { getMainDefinition } from '@apollo/client/utilities';
import { DocumentNode, Kind, OperationTypeNode } from 'graphql';

export function isQuery(query: DocumentNode) {
  const definition = getMainDefinition(query);
  return (
    definition.kind === Kind.OPERATION_DEFINITION &&
    definition.operation === OperationTypeNode.QUERY
  );
}

export function isMutation(query: DocumentNode) {
  const definition = getMainDefinition(query);
  return (
    definition.kind === Kind.OPERATION_DEFINITION &&
    definition.operation === OperationTypeNode.MUTATION
  );
}

export function isSubscription(query: DocumentNode) {
  const definition = getMainDefinition(query);
  return (
    definition.kind === Kind.OPERATION_DEFINITION &&
    definition.operation === OperationTypeNode.SUBSCRIPTION
  );
}
