export default function joinPathnames(...parts: unknown[]) {
  return `/${parts
    .map((part) => String(part).replace(/^\/|\/$/g, ''))
    .filter((part) => part.length > 0)
    .join('/')}`;
}
