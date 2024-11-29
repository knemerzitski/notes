/**
 * @returns Current window scroll position, 0 - top, 1 - bottom, false - no scroll
 */
export function getWindowScrollPosition() {
  const delta = 1;
  if (Math.abs(document.body.scrollHeight - window.innerHeight) <= delta) {
    // No scroll
    return false;
  }

  const maxScrollY = document.body.scrollHeight - window.innerHeight - delta;
  const scrollY = Math.ceil(window.scrollY);

  // 0 - top, 1 - bottom
  const scrollPos = Math.max(0, Math.min(1, scrollY / maxScrollY));

  return scrollPos;
}
