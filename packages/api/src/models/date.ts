import { coerce, date, number } from 'superstruct';

export const DateNumberStruct = coerce(
  date(),
  number(),
  (time) => new Date(time),
  (date) => date.getTime()
);
