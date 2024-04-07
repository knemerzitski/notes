export default function sortObject(obj: unknown): unknown {
  if (obj == null) return obj;

  if (Array.isArray(obj)) {
    return obj.map((arrItem) => sortObject(arrItem));
  } else if (typeof obj === 'object') {
    const castObj = obj as Record<string, unknown>;
    const sortedKeys = Object.keys(castObj).sort();
    const sortedObj = sortedKeys.reduce<Record<string, unknown>>((newObj, key) => {
      newObj[key] = sortObject(castObj[key]);
      return newObj;
    }, {});

    return sortedObj;
  }

  return obj;
}
