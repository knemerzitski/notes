import { resetDatabase as api_resetDatabase } from '../../../api/src/__tests__/helpers/mongodb/mongodb';

export function resetDatabase() {
  return api_resetDatabase();
}
