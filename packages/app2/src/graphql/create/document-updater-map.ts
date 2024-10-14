import { getMainDefinition } from '@apollo/client/utilities';
import {
  DocumentUpdateDefinition,
  DocumentUpdateDefinitions,
  DocumentUpdaterMap,
} from '../types';
import { DocumentNode, Kind } from 'graphql';
import { operationDefinitionFragmentPaths } from '../utils/fragments-paths';
import { updateWithFragments } from '../utils/update-with-fragments';
import { isDefined } from '~utils/type-guards/is-defined';
import { getFragmentTypeCondition } from '../utils/get-fragment-type-condition';

export function createDocumentUpdaterMap(
  updateDefinitions: DocumentUpdateDefinitions
): DocumentUpdaterMap {
  const operationUpdaterByName = definitionsToDocumentUpdaterMap(updateDefinitions);
  const updateDefinitionByName = createDefinitionsByName(updateDefinitions);

  for (const { document } of updateDefinitions) {
    const definition = getMainDefinition(document);
    if (definition.kind !== Kind.OPERATION_DEFINITION) {
      continue;
    }

    const operationName = definition.name?.value;
    if (!operationName) {
      continue;
    }

    // Modify operations to invoke fragments update when operation update is invoked
    const update = updateWithFragments(
      operationUpdaterByName.get(operationName),
      operationDefinitionFragmentPaths(definition)
        .map(({ fragmentName, path }) => {
          const definition = updateDefinitionByName[fragmentName];
          if (!definition) return;

          return {
            update: definition.update,
            __typename: getFragmentTypeCondition(definition.document),
            path,
          };
        })
        .filter(isDefined)
    );

    if (update) {
      operationUpdaterByName.delete(document);
      operationUpdaterByName.set(document, update);
    }
  }

  return operationUpdaterByName;
}

function definitionsToDocumentUpdaterMap(
  updateDefinitions: DocumentUpdateDefinitions
): DocumentUpdaterMap {
  const updaterByName: Record<string, ReturnType<DocumentUpdaterMap['get']>> = {};

  function getName(documentOrName: DocumentNode | string) {
    if (typeof documentOrName !== 'string') {
      const definition = getMainDefinition(documentOrName);

      return definition.name?.value;
    }
    return documentOrName;
  }

  const set: DocumentUpdaterMap['set'] = (document, update) => {
    const definition = getMainDefinition(document);

    const operationName = definition.name?.value;
    if (!operationName) {
      throw new Error('Definition name is required');
    }

    if (operationName in updaterByName) {
      throw new Error(`Duplicate definition name: "${operationName}"`);
    }

    updaterByName[operationName] = update;
  };

  const get: DocumentUpdaterMap['get'] = (documentOrName) => {
    const name = getName(documentOrName);
    if (!name) {
      return;
    }

    return updaterByName[name];
  };

  const _delete: DocumentUpdaterMap['delete'] = (documentOrName) => {
    const name = getName(documentOrName);
    if (!name) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete updaterByName[name];
  };

  for (const { document, update } of updateDefinitions) {
    if (update) {
      set(document, update);
    }
  }

  return {
    set,
    get,
    delete: _delete,
  };
}

function createDefinitionsByName(definitions: DocumentUpdateDefinitions) {
  const definitionByName: Record<string, DocumentUpdateDefinition> = {};

  for (const definition of definitions) {
    const name = getMainDefinition(definition.document).name?.value;
    if (name) {
      definitionByName[name] = definition;
    }
  }

  return definitionByName;
}
