import { SelectionRange, SelectionDirection } from '../../editor/selection-range';

const DEFAULT_DIRECTION_MAPPING = {
  [SelectionDirection.Forward]: '>',
  [SelectionDirection.Backward]: '<',
  [SelectionDirection.None]: '|',
};

/**
 * Adds carets to text to indicate selection position and directions. \
 * \> - forward position \
 * < - backward position \
 * Two < ... < or > ... > is a range.
 * @param text
 * @param selection
 * @param mapping How to map direction to a character
 * @returns Text with selection
 */
export function textWithSelection(
  text: string,
  selection: Pick<SelectionRange, 'start' | 'end' | 'direction'>,
  mapping = DEFAULT_DIRECTION_MAPPING
) {
  const dirChar = mapping[selection.direction];
  if (selection.start === selection.end) {
    return text.substring(0, selection.start) + dirChar + text.substring(selection.start);
  }
  return (
    text.substring(0, selection.start) +
    dirChar +
    text.substring(selection.start, selection.end) +
    dirChar +
    text.substring(selection.end)
  );
}

/**
 * Eg. {@link text} = both typing[0>] at the same time[1>] \
 * returns \
 *  'both typing> at the same time', \
 *  'both typing at the same time>', \
 * ] \
 * Returned array value is indexed by [#] where # is index. \
 * Only supports single digits.
 */
export function parseTextWithMultipleSelections(textWithSelection: string) {
  const cursorIndexes: [number, number, string][] = [];
  let rawText = '';

  for (let i = 0, pos = 0; i < textWithSelection.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const c = textWithSelection[i]!;
    if (c === '[') {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const idx = Number.parseInt(textWithSelection[++i]!);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const dirMark = textWithSelection[++i]!;
      const val = cursorIndexes[idx];
      if (!val) {
        cursorIndexes[idx] = [pos, pos, dirMark];
      } else {
        val[1] = pos;
      }
      i++;
    } else {
      rawText += c;
      pos++;
    }
  }

  return {
    rawText,
    textWithSelection: cursorIndexes.map(([pos1, pos2, dirMark]) =>
      pos1 === pos2
        ? rawText.substring(0, pos1) + dirMark + rawText.substring(pos1)
        : rawText.substring(0, pos1) +
          dirMark +
          rawText.substring(pos1, pos2) +
          dirMark +
          rawText.substring(pos2)
    ),
  };
}
