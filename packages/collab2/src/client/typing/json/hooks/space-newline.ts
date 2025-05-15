import { TextParseHook } from '../text-parser';

export const spaceNewline: TextParseHook = {
  preStringify(value) {
    return value.replace(/\n/g, '\n ');
  },
  postParse(value) {
    return value.replace(/\n /g, '\n');
  },
};
