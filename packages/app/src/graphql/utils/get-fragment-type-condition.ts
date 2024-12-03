import { DocumentNode } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { Kind } from 'graphql';

export function getFragmentTypeCondition(document: DocumentNode): string | undefined {
  const definition = getMainDefinition(document);
  if (definition.kind !== Kind.FRAGMENT_DEFINITION) {
    return;
  }

  return definition.typeCondition.name.value;
}
