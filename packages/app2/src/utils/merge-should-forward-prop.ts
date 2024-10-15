export function mergeShouldForwardProp(...props: string[][]) {
  const set = new Set(...props);
  return (prop: string) => !set.has(prop);
}
