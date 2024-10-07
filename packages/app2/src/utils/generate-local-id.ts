import { nanoid } from 'nanoid';

/**
 * Generates an id that is guaranteed to be unique and will
 * not conflict with ids provided by the server.
 */
export function generateLocalId() {
  // Server ids are at least 16 characters long.
  // Anything less than that is safe to generate.
  return nanoid(14);
}
