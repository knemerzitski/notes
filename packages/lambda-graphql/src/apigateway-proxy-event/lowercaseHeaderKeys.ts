type Headers = Record<string, string | undefined>;

export default function lowercaseHeaderKeys(headers?: Headers): Headers {
  if (!headers) return {};

  return Object.entries(headers).reduce<Headers>((map, [key, value]) => {
    map[String.prototype.toLowerCase.call(key)] = value;
    return map;
  }, {});
}
