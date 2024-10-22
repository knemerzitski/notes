export function mergeShouldForwardProp(...props: (string[] | string)[]) {
  const set = new Set<string>(props.flatMap((p) => p));
  return (prop: string) => !set.has(prop);
}
