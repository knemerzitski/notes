import { OperationVariables } from '@apollo/client';
import { isObjectLike } from '../../../../utils/src/type-guards/is-object-like';

export function findVariablesAuthUserId(
  variables: OperationVariables | undefined
): string | undefined {
  if (!variables) {
    return;
  }

  if (isObjectLike(variables.authUser)) {
    const authUser = variables.authUser;
    if (typeof authUser.id === 'string') {
      return authUser.id;
    }
  } else if (isObjectLike(variables.input)) {
    return findVariablesAuthUserId(variables.input);
  }

  return;
}
