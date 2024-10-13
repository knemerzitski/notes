import { DocumentNode, OperationTypeNode } from 'graphql';
import { getOperationKind } from './get-operation-kind';

export function isQuery(query: DocumentNode) {
  return getOperationKind(query) === OperationTypeNode.QUERY;
}
