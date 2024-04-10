import { DBRevisionRecord } from '../models/collab/embedded/revision-record';
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

export type CollabTextRevisionRecordsPaginationOutput =
  RelayArrayPaginationOutput<DBRevisionRecord>;

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

export function mapRevisionRecordsPaginationInputToOutput(
  input: RelayArrayPaginationInput<number>['paginations'],
  output: RelayArrayPaginationOutput<DBRevisionRecord>
): DBRevisionRecord[][] {
  return consecutiveIntArrayMapPaginationOutputToInput(input, output, toCursor);
}
