import { Selection } from '../../common/selection';

const CARET_MARK = '│';
const START_LABEL = '▸';
const END_LABEL = '◂';
const COLLAPSED_LABEL = '▾';

export function textWithSelection(text: string, selection: Selection) {
  if (selection.isCollapsed()) {
    return (
      text.substring(0, selection.start) + CARET_MARK + text.substring(selection.start)
    );
  }

  return (
    text.substring(0, selection.start) +
    CARET_MARK +
    text.substring(selection.start, selection.end) +
    CARET_MARK +
    text.substring(selection.end)
  );
}

export function textWithSelections(
  text: string,
  labelledSelections: { label: string; selection: Selection }[]
): string {
  const insertions: { index: number; value: string }[] = [];
  for (const { label, selection } of labelledSelections) {
    if (selection.isCollapsed()) {
      insertions.push({
        index: selection.start,
        value: `${CARET_MARK}${label}${COLLAPSED_LABEL}`,
      });
    } else {
      insertions.push({
        index: selection.start,
        value: `${CARET_MARK}${label}${START_LABEL}`,
      });
      insertions.push({
        index: selection.end,
        value: `${END_LABEL}${label}${CARET_MARK}`,
      });
    }
  }

  insertions.sort((a, b) => b.index - a.index);

  let result = text;
  for (const { index, value } of insertions) {
    result = `${result.slice(0, index)}${value}${result.slice(index)}`;
  }

  return result;
}
