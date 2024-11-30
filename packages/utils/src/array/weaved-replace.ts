/**
 *
 * In-place replaces only items in array that matches the predicate. \
 * E.g. \
 * `(['b',a','c'], [1,'a','2','b','3'], isString) => [1,'b','2','a','c','3']`
 */
export function weavedReplace<T>(
  newItems: T[],
  allItems: T[],
  predicate: (item: T) => boolean
) {
  let j = 0;
  function getNextReplaceItem() {
    while (j < newItems.length) {
      const newItem = newItems[j++];
      if (newItem === undefined) {
        continue;
      }
      return newItem;
    }

    return;
  }

  let lastTargetIndex = -1;
  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    if (item === undefined) {
      continue;
    }

    const isTargetItem = predicate(item);
    if (isTargetItem) {
      lastTargetIndex = i;
      const replaceItem = getNextReplaceItem();
      if (replaceItem !== undefined) {
        if (predicate(replaceItem)) {
          allItems[i] = replaceItem;
        } else {
          allItems.splice(i, 0, replaceItem);
        }
      } else {
        allItems.splice(i, 1);
        i--;
      }
    }
  }

  if (j < newItems.length) {
    allItems.splice(lastTargetIndex + 1, 0, ...newItems.slice(j));
  }

  return allItems;
}
