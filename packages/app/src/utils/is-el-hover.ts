export function isElHover(el: Pick<HTMLElement, 'matches'>): boolean {
  return el.matches(':hover');
}
