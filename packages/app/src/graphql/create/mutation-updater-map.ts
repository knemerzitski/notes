import {
  MutationUpdaterFunction,
  OperationVariables,
  DefaultContext,
  ApolloCache,
} from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { DocumentNode, Kind } from 'graphql/index';

import { isDefined } from '~utils/type-guards/is-defined';

import { MutationDefinitions } from '../types';
import { operationDefinitionFragmentPaths } from '../utils/fragments-paths';
import { getFragmentTypeCondition } from '../utils/get-fragment-type-condition';
import { MutationDefinition } from '../utils/mutation-definition';
import { updateWithFragments } from '../utils/update-with-fragments';

export interface MutationUpdaterFunctionMap {
  set: (
    document: DocumentNode,
    update: MutationUpdaterFunction<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any,
      OperationVariables,
      DefaultContext,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ApolloCache<any>
    >
  ) => void;
  get: (documentOrOperationName: DocumentNode | string) =>
    | MutationUpdaterFunction<
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        any,
        OperationVariables,
        DefaultContext,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ApolloCache<any>
      >
    | undefined;
  delete: (documentOrOperationName: DocumentNode | string) => void;
}

export function createMutationUpdaterFunctionMap(
  definitions: MutationDefinitions
): MutationUpdaterFunctionMap {
  const operationUpdaterByName = definitionsToMap(definitions);
  const updateDefinitionByName = createDefinitionByName(definitions);

  for (const { document } of definitions) {
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

function definitionsToMap(definitions: MutationDefinitions): MutationUpdaterFunctionMap {
  const updaterByName: Record<string, ReturnType<MutationUpdaterFunctionMap['get']>> = {};

  function getName(documentOrName: DocumentNode | string) {
    if (typeof documentOrName !== 'string') {
      const definition = getMainDefinition(documentOrName);

      return definition.name?.value;
    }
    return documentOrName;
  }

  const set: MutationUpdaterFunctionMap['set'] = (document, update) => {
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

  const get: MutationUpdaterFunctionMap['get'] = (documentOrName) => {
    const name = getName(documentOrName);
    if (!name) {
      return;
    }

    return updaterByName[name];
  };

  const _delete: MutationUpdaterFunctionMap['delete'] = (documentOrName) => {
    const name = getName(documentOrName);
    if (!name) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete updaterByName[name];
  };

  for (const { document, update } of definitions) {
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

function createDefinitionByName(definitions: MutationDefinitions) {
  const definitionByName: Record<string, MutationDefinition> = {};

  for (const definition of definitions) {
    const name = getMainDefinition(definition.document).name?.value;
    if (name) {
      definitionByName[name] = definition;
    }
  }

  return definitionByName;
}
