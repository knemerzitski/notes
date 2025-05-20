import { Changeset } from '../../common/changeset';
import { followChangesetSelection } from '../../common/utils/follow-changeset-selection';
import { ServerRecord } from '../types';

type R = Pick<ServerRecord, 'changeset' | 'inverse' | 'selectionInverse' | 'selection'>;

export function follow(A: R, B: R, textB: Changeset | string, isA: boolean): R {
  return followChangesetSelection(A, B.changeset, textB, isA);
}
