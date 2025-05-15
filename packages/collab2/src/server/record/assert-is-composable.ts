import { Changeset } from '../../common/changeset';
import { ServerRecord } from '../types';

type R = Pick<ServerRecord, 'changeset' | 'revision'>;

export function assertIsComposable(left: R, right: R) {
  if (left.revision + 1 !== right.revision) {
    throw new Error(
      `Revision "${left.revision}" is not composable after revision "${right.revision}"`
    );
  }

  Changeset.assertIsComposable(left.changeset, right.changeset);
}
