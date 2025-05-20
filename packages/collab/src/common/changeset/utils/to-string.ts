import { Changeset } from '..';

export function toString(changeset: Changeset) {
  return `${inputOutputLengthToString(changeset)}${stripsToString(changeset)}`;
}

function inputOutputLengthToString(changeset: Changeset) {
  return `(${changeset.inputLength} -> ${changeset.outputLength})`;
}

function stripsToString(changeset: Changeset) {
  return `[${changeset.strips.join(', ')}]`;
}
