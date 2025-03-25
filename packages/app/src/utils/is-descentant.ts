export function isDescendant(el: Element, target: object | null): boolean {
  if (!isParentNode(target)) {
    return false;
  }

  return el === target || isDescendant(el, target.parentNode);
}

function isParentNode(value: object | null): value is Pick<ParentNode, 'parentNode'> {
  if (value == null) {
    return false;
  }

  if (!('parentNode' in value)) {
    return false;
  }
  return true;
}
