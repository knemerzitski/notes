import { getOperationName } from '@apollo/client/utilities';
import { MutationOperation, MutationOperations, UpdateHandlersByName } from '../types';

export function createUpdateHandlersByName(
  operations: MutationOperations
): UpdateHandlersByName {
  const updateHandlersByName = {};
  operations.forEach((op) => {
    setMutationHandler(op, updateHandlersByName);
  });
  return updateHandlersByName;
}

function setMutationHandler(
  operation: MutationOperation,
  handlersByName: UpdateHandlersByName
) {
  const operationName = getOperationName(operation.mutation);
  if (!operationName) {
    throw new Error('Operation name is required');
  }

  if (operation.update) {
    if (
      handlersByName[operationName] &&
      handlersByName[operationName] !== operation.update
    ) {
      throw new Error(`Update handler already exists for operation: "${operationName}"`);
    }
    handlersByName[operationName] = operation.update;
  }
}
