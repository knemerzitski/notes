import { Changeset } from '../changeset';
import { compose } from './compose';

export function applyToText(changeset: Changeset, text: string): string {
  return compose(Changeset.fromText(text), changeset).getText();
}
