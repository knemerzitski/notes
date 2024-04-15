import { RevisionRecordSchema } from '../../schema/collabText/collab-text';
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

export type CollabTextRevisionRecordsPaginationOutput<T = RevisionRecordSchema> =
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

function toCursor({ revision }: Pick<RevisionRecordSchema, 'revision'>) {
  return revision;
}

export function mapRevisionRecordsPaginationInputToOutput<
  T extends Pick<RevisionRecordSchema, 'revision'>,
>(
  input: RelayArrayPaginationInput<number>['paginations'],
  output: RelayArrayPaginationOutput<T>
): T[][] {
  return consecutiveIntArrayMapPaginationOutputToInput(input, output, toCursor);
}

export function assertRecordRevisionDefined<
  T extends Partial<Pick<RevisionRecordSchema, 'revision'>>,
>(
  output: RelayArrayPaginationOutput<T>
): asserts output is RelayArrayPaginationOutput<
  T & {
    revision: RevisionRecordSchema['revision'];
  }
> {
  for (const record of output.array) {
    if (record.revision == null) {
      throw new Error('Expected record.revision to be defined');
    }
  }
}
