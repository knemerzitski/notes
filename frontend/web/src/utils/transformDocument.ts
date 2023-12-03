import { DocumentTransform, TypedDocumentNode } from '@apollo/client';

export default function transformDocument<TResult, TVariables>(
  documentTransform: DocumentTransform,
  document: TypedDocumentNode<TResult, TVariables>
): TypedDocumentNode<TResult, TVariables> {
  return documentTransform.transformDocument(document);
}
