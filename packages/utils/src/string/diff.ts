/**
 * @returns Index of first different character or -1 if strings are equal.
 */
export function indexOfDiff(str1: string, str2: string): number {
  if (str1.length < 100) {
    return indexOfDiffLoop(str1, str2);
  }

  if (str1 === str2) {
    return -1;
  }

  if (str1.length === 1 || str2.length === 1) {
    return 0;
  }

  const right = Math.min(str1.length, str2.length);
  const mid = Math.floor(right / 2);

  const leftSub1 = str1.substring(0, mid);
  const leftSub2 = str2.substring(0, mid);

  const isLeftEqual = leftSub1 === leftSub2;
  if (isLeftEqual) {
    const rightSub1 = str1.substring(mid, right);
    const rightSub2 = str2.substring(mid, right);
    return mid + indexOfDiff(rightSub1, rightSub2);
  } else {
    return indexOfDiff(leftSub1, leftSub2);
  }
}

function indexOfDiffLoop(str1: string, str2: string): number {
  if (str1 === str2) {
    return -1;
  }

  const n = Math.min(str1.length, str2.length);
  for (let i = 0; i < n; i++) {
    if (str1[i] !== str2[i]) {
      return i;
    }
  }

  return -1;
}

/**
 * Length offset from either string where first character is different or -1 if strings are equal.
 */
export function lengthOffsetOfDiff(str1: string, str2: string): number {
  if (str1.length < 100) {
    return lengthOffsetOfDiffLoop(str1, str2);
  }

  if (str1 === str2) {
    return -1;
  }

  if (str1.length === 1 || str2.length === 1) {
    return 0;
  }

  const left = Math.min(str1.length, str2.length);
  const mid = Math.floor(left / 2);

  const rightSub1 = str1.substring(str1.length - mid);
  const rightSub2 = str2.substring(str2.length - mid);

  const isRightEqual = rightSub1 === rightSub2;
  if (isRightEqual) {
    const leftSub1 = str1.substring(0, str1.length - mid);
    const leftSub2 = str2.substring(0, str2.length - mid);
    return mid + lengthOffsetOfDiff(leftSub1, leftSub2);
  } else {
    return lengthOffsetOfDiff(rightSub1, rightSub2);
  }
}

function lengthOffsetOfDiffLoop(str1: string, str2: string): number {
  if (str1 === str2) {
    return -1;
  }

  const n = Math.min(str1.length, str2.length);
  for (let i = 1; i <= n; i++) {
    if (str1[str1.length - i] !== str2[str2.length - i]) {
      return i - 1;
    }
  }

  return -1;
}

export function diff(str1: string, str2: string) {
  if (str1 === str2) {
    return;
  }

  const startIndex = indexOfDiff(str1, str2);
  const lengthOffset = lengthOffsetOfDiff(str1, str2);

  return {
    index: startIndex,
    before: str1.substring(startIndex, str1.length - lengthOffset),
    after: str2.substring(startIndex, str2.length - lengthOffset),
  };
}