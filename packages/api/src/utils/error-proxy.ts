// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createErrorProxy(propertyName: string, contextName: string): any {
  return new Proxy(
    {},
    {
      get() {
        return `${propertyName} is not available in ${contextName}`;
      },
    }
  );
}
