export type RangeRelation = OverlapRangeRelation | NoOverlapRangeRelation;

interface OverlapRangeRelation {
  overlap: true;
  position: OverlapRangePositioning;
  connected: false;
}

interface NoOverlapRangeRelation {
  overlap: false;
  position: NoOverlapRangePositioning;
  connected: boolean;
}

type OverlapRangePositioning = 'inside' | 'outside' | NoOverlapRangePositioning;
type NoOverlapRangePositioning = 'left' | 'right';

export function isRangeOverlap(x1: number, x2: number, y1: number, y2: number) {
  return Math.max(x2, y2) - Math.min(x1, y1) <= x2 - x1 + (y2 - y1);
}

export function rangeRelation(
  x1: number,
  x2: number,
  y1: number,
  y2: number,
  step = 1
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
      connected: false,
    };
  }

  return {
    overlap,
    position: x1 < y1 ? 'left' : 'right',
    connected: x2 + step === y1 || y2 + step === x1,
  };
}
