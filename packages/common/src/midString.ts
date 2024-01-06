const CHAR_A = 'a';
const CHAR_Z = 'z';

const CODE_START = 96;
const CODE_A = 97;
const CODE_B = 98;
const CODE_Z = 122;
const CODE_END = 123;

/**
 * @see {@link https://stackoverflow.com/questions/38923376/return-a-new-string-that-sorts-between-two-given-strings/38927158#38927158}
 * On empty strings returns "n"
 * @returns smallest possible string that is lexicographically ordered between {@link prev} and {@link next}
 */
export default function midString(prev: string, next: string): string {
  // Find leftmost non-matching position
  let pos = 0;
  let codePrev = 0;
  let codeNext = 0;
  for (; codePrev === codeNext; pos++) {
    codePrev = pos < prev.length ? prev.charCodeAt(pos) : CODE_START;
    codeNext = pos < next.length ? next.charCodeAt(pos) : CODE_END;
  }

  // Matching left part of string
  let str = prev.slice(0, pos - 1);

  if (codePrev === CODE_START) {
    while (codeNext === CODE_A) {
      codeNext = pos < next.length ? next.charCodeAt(pos++) : CODE_END;
      str += CHAR_A;
    }
    if (codeNext === CODE_B) {
      str += CHAR_A;
      codeNext = CODE_END;
    }
  } else if (codePrev + 1 === codeNext) {
    // Two consecutive chars
    str += String.fromCharCode(codePrev);
    codeNext = CODE_END;
    while (
      (codePrev = pos < prev.length ? prev.charCodeAt(pos++) : CODE_START) == CODE_Z
    ) {
      str += CHAR_Z;
    }
  }

  // Append middle between prev and next char
  return str + String.fromCharCode(Math.ceil((codePrev + codeNext) / 2));
}
