import { expect, it } from 'vitest';

import { matchPathSuffix } from './match-path-suffix';

it.each([
  [['/u/0/local/note/:id?', 'note/:id?'], '/u/0/note/noteid', 'note/:id?'],
  [['note_wrong/:id?'], '/u/0/note/noteid', undefined],
  [['note/fix'], '/u/0/note/noteid', undefined],
  [['note'], '/u/0/note/noteid', undefined],
  [['note'], '/a/note/noteid', undefined],
  [['a/b/c'], '/a/b/c', 'a/b/c'],
  [['b/c'], '/a/b/c', 'b/c'],
  [['g/c'], '/a/b/c', undefined],
  [['b/c/*'], '/a/b/c/d/e', 'b/c/*'],
])('%s => %s', (pathsPatterns, locationPathname, expectedMatch) => {
  expect(matchPathSuffix(pathsPatterns, locationPathname)).toStrictEqual(expectedMatch);
});
