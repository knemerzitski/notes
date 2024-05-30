export function joinPathnames(...parts: unknown[]) {
  return `/${parts
    .map((part) => String(part).replace(/^\/|\/$/g, ''))
    .filter((part) => part.length > 0)
    .join('/')}`;
}

export function slicePathnames(pathname: string, start: number, end?: number): string {
  return joinPathnames(
    ...pathname
      .split('/')
      .filter((path) => path)
      .slice(start, end)
  );
}
