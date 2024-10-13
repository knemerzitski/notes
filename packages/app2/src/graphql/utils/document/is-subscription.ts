import { DocumentNode, OperationTypeNode } from 'graphql';
import { getOperationKind } from './get-operation-kind';

export function isSubscription(query: DocumentNode) {
  return getOperationKind(query) === OperationTypeNode.SUBSCRIPTION;
}
