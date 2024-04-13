import mapObject from 'map-obj';
import {
  RelayArrayPaginationInput,
  RelayArrayPaginationOutput,
  relayArrayPaginationMapOutputToInput,
} from './relayArrayPagination';
import { PipelineStage } from 'mongoose';

export interface RelayMultiArrayPaginationConcatInput<TArrayKey extends string> {
  /**
   * Field path paginations to concat into single array.
   * Object at path must have structure: {@link RelayArrayPaginationOutput}
   */
  paths: TArrayKey[];
}

export interface RelayMultiArrayPaginationConcatOutput<TItem> {
  array: RelayArrayPaginationOutput<TItem>['array'];
  multiSizes: (Exclude<RelayArrayPaginationOutput<TItem>['sizes'], undefined> | number)[];
}

export default function relayMultiArrayPaginationConcat<TArrayKey extends string>(
  input: RelayMultiArrayPaginationConcatInput<TArrayKey>
): PipelineStage.Project['$project'] {
  return {
    $reduce: {
      input: input.paths.map((path) => `$${path}`),
      initialValue: {
        array: [],
        multiSizes: [],
      },
      in: {
        array: {
          $concatArrays: ['$$value.array', '$$this.array'],
        },
        multiSizes: {
          $concatArrays: [
            '$$value.multiSizes',
            [
              {
                $ifNull: ['$$this.sizes', { $size: '$$this.array' }],
              },
            ],
          ],
        },
      },
    },
  };
}

export function multiRelayArrayPaginationMapOutputToInput<
  TCursor,
  TItem,
  TArrayKey extends string,
>(
  input: Record<TArrayKey, RelayArrayPaginationInput<TCursor>['paginations']>,
  output: RelayMultiArrayPaginationConcatOutput<TItem>
): Record<TArrayKey, TItem[][]> {
  let sliceStart = 0;
  let index = 0;
  return mapObject(input, (key, relayInput) => {
    const sizes = output.multiSizes[index];
    if (sizes == null) {
      throw new Error(`Expected sizes at index ${index}`);
    }
    index++;

    const sizeSum = Array.isArray(sizes) ? sizes.reduce((a, b) => a + b, 0) : sizes;
    const end = sliceStart + sizeSum;

    const result = relayArrayPaginationMapOutputToInput(relayInput, {
      array: output.array.slice(sliceStart, end),
      sizes: Array.isArray(sizes) ? sizes : undefined,
    });
    sliceStart = end;

    return [key, result];
  });
}
