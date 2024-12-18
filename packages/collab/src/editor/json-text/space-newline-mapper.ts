import { StructJsonMapper } from './struct-json-formatter';

export const spaceNewlineMapper: StructJsonMapper = {
  preStringify(value) {
    return value.replace(/\n/g, '\n ');
  },
  postParse(value) {
    return value.replace(/\n /g, '\n');
  },
};
