import { TypedDocumentNode, useApolloClient } from '@apollo/client';

export default function useTransformDocument<TResult, TVariables>(
  document: TypedDocumentNode<TResult, TVariables>
): TypedDocumentNode<TResult, TVariables> {
  const apolloClient = useApolloClient();

  return apolloClient.documentTransform.transformDocument(document);
}
