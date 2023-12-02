import { ApolloClient, TypedDocumentNode } from '@apollo/client';

export default function transformDocument<TCacheShape, TResult, TVariables>(
  client: ApolloClient<TCacheShape>,
  document: TypedDocumentNode<TResult, TVariables>
): TypedDocumentNode<TResult, TVariables> {
  return client.documentTransform.transformDocument(document);
}
