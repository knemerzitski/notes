/**
 * @see {@link https://stackoverflow.com/questions/38923376/return-a-new-string-that-sorts-between-two-given-strings/38927158#38927158}
 * On empty strings returns "n"
 * @param {number} firstCode First character code to include in lookup, defaults to 97 = "a"
 * @param {number} lastCode Last character code to include in lookup, defaults to 122 = "z"
 * @returns smallest possible string that is lexicographically ordered between {@link prev} and {@link next}
 */
export default function midString(prev: string, next: string, firstCode = 97, lastCode = 122): string {
  const codeStart = firstCode - 1;
  const codeEnd = lastCode + 1;
  const charFirst = String.fromCharCode(firstCode);
  const charLast = String.fromCharCode(lastCode);

  // Find leftmost non-matching position
  let pos = 0;
  let codePrev = 0;
  let codeNext = 0;
  for (; codePrev === codeNext; pos++) {
    codePrev = pos < prev.length ? prev.charCodeAt(pos) : codeStart;
    codeNext = pos < next.length ? next.charCodeAt(pos) : codeEnd;
  }

  // Matching left part of string
  let str = prev.slice(0, pos - 1);

  if (codePrev === codeStart) {
    while (codeNext === firstCode) {
      codeNext = pos < next.length ? next.charCodeAt(pos++) : codeEnd;
      str += charFirst;
    }
    if (codeNext === firstCode + 1) {
      str += charFirst;
      codeNext = codeEnd;
    }
  } else if (codePrev + 1 === codeNext) {
    // Two consecutive chars
    str += String.fromCharCode(codePrev);
    codeNext = codeEnd;
    while (
      (codePrev = pos < prev.length ? prev.charCodeAt(pos++) : codeStart) == lastCode 
    ) {
      str += charLast;
    }
  }

  // Append middle between prev and next char
  return str + String.fromCharCode(Math.ceil((codePrev + codeNext) / 2));
}
