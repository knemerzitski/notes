export type RangeRelation = OverlapRangeRelation | NoOverlapRangeRelation;

interface OverlapRangeRelation {
  overlap: true;
  position: OverlapRangePositioning;
  distance: 0;
}

interface NoOverlapRangeRelation {
  overlap: false;
  position: NoOverlapRangePositioning;
  distance: number;
}

type OverlapRangePositioning = 'inside' | 'outside' | NoOverlapRangePositioning;
type NoOverlapRangePositioning = 'left' | 'right';

/**
 * @return True if range [x1,x2) is overlapping [y1,y2)
 */
export function isRangeOverlap(x1: number, x2: number, y1: number, y2: number) {
  return Math.max(x2, y2) - Math.min(x1, y1) <= x2 - x1 + (y2 - y1) - 1;
}

/**
 * @return Range [x1,x2) relation relative to [y1,y2)
 */
export function rangeRelation(
  x1: number,
  x2: number,
  y1: number,
  y2: number
): RangeRelation {
  const overlap = isRangeOverlap(x1, x2, y1, y2);

  if (overlap) {
    let position: OverlapRangePositioning;
    if (y1 <= x1 && x2 <= y2) {
      position = 'inside';
    } else if (x1 <= y1 && y2 <= x2) {
      position = 'outside';
    } else {
      if (x1 < y1) {
        position = 'left';
      } else {
        position = 'right';
      }
    }

    return {
      overlap,
      position,
      distance: 0,
    };
  }

  const isLeft = x1 < y1;

  if (isLeft) {
    return {
      overlap,
      position: 'left',
      distance: y1 - x2 + 1,
    };
  } else {
    return {
      overlap,
      position: 'right',
      distance: x1 - y2 + 1,
    };
  }
}
