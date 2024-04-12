import { DBRevisionRecord } from '../../models/collab/embedded/revision-record';
import consecutiveIntArrayPagination, {
  consecutiveIntArrayMapPaginationOutputToInput,
} from './consecutiveIntArrayPagination';
import {
  RelayArrayPaginationInput,
  RelayArrayPaginationOutput,
} from './relayArrayPagination';

export type CollabTextRevisionRecordsPaginationInput = Omit<
  RelayArrayPaginationInput<number>,
  'arrayFieldPath' | 'arrayItemPath'
>;

export type CollabTextRevisionRecordsPaginationOutput<T = DBRevisionRecord> =
  RelayArrayPaginationOutput<T>;

export default function revisionRecordsPagination(
  input: CollabTextRevisionRecordsPaginationInput
) {
  return consecutiveIntArrayPagination({
    arrayFieldPath: 'records',
    arrayItemPath: 'revision',
    ...input,
  });
}

function toCursor({ revision }: Pick<DBRevisionRecord, 'revision'>) {
  return revision;
}

export function mapRevisionRecordsPaginationInputToOutput<
  T extends Pick<DBRevisionRecord, 'revision'>,
>(
  input: RelayArrayPaginationInput<number>['paginations'],
  output: RelayArrayPaginationOutput<T>
): T[][] {
  return consecutiveIntArrayMapPaginationOutputToInput(input, output, toCursor);
}

export function assertRecordRevisionDefined<
  T extends Partial<Pick<DBRevisionRecord, 'revision'>>,
>(
  output: RelayArrayPaginationOutput<T>
): asserts output is RelayArrayPaginationOutput<
  T & {
    revision: DBRevisionRecord['revision'];
  }
> {
  for (const record of output.array) {
    if (record.revision == null) {
      throw new Error('Expected record.revision to be defined');
    }
  }
}
