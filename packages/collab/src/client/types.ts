import { Changeset } from '../changeset';

import { SelectionRange } from './selection-range';

export interface SelectionChangeset {
  /**
   * Changeset to be composed
   */
  changeset: Changeset;
  /**
   * Selection after changeset is composed
   */
  afterSelection: SelectionRange;
  /**
   * Selection before changeset is composed
   */
  beforeSelection?: SelectionRange;
}
