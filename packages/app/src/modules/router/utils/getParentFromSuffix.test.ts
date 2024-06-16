import { expect, it } from 'vitest';

import getParentFromSuffix from './getParentFromSuffix';

it.each([
  ['note/:id?', '/more/a/note/noteid', '/more/a'],
  ['note/:id?', '/note/noteid', '/'],
  ['note/:id?', '/u/0/note/aaaa', '/u/0'],
])('%s => %s', (path, locationPathname, expectedResult) => {
  expect(getParentFromSuffix(path, locationPathname)).toStrictEqual(expectedResult);
});
