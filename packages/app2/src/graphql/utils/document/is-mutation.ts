import { DocumentNode, OperationTypeNode } from 'graphql';
import { getOperationKind } from './get-operation-kind';

export function isMutation(query: DocumentNode) {
  return getOperationKind(query) === OperationTypeNode.MUTATION;
}
