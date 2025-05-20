import { Strip, RetainStrip, InsertStrip, Changeset } from '../../../../common/changeset';
import { TextParser } from '../text-parser';
import { FieldText } from '../types';

export function toFieldChangeset(
  changeset: Changeset,
  prevText: string,
  prevFieldValue: FieldText['value'],
  prevFieldMetadata: NonNullable<FieldText['metadata']>,
  fieldMetadata: NonNullable<FieldText['metadata']>,
  textParser: Pick<TextParser, 'parseString'>
) {
  const result: Strip[] = [];

  const start = fieldMetadata.start;
  const end = fieldMetadata.end;

  let pos = -1;
  for (const strip of changeset.sliceText(start, end)) {
    if (RetainStrip.is(strip)) {
      if (pos === -1) {
        // Initialize position
        const text = prevText.slice(prevFieldMetadata.start, strip.start);
        const parsedText = textParser.parseString(text);
        pos = parsedText.length;
      }

      const text = prevText.slice(strip.start, strip.end);
      const parsedText = textParser.parseString(text);

      const retainStrip = RetainStrip.create(pos, pos + parsedText.length);
      pos += retainStrip.length;
      result.push(retainStrip);
    } else if (InsertStrip.is(strip)) {
      const parsedText = textParser.parseString(strip.value);
      const insertStrip = InsertStrip.create(parsedText);
      result.push(insertStrip);
    }
  }

  return Changeset.create(prevFieldValue.length, result);
}
