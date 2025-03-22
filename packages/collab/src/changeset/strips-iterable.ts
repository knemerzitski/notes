import { getDefaultStripLength } from './strip-length';

import { Strip } from '.';

type StripValue = Strip | undefined;

interface StripContext {
  strip: StripValue;
  next: () => void;
}

type ReturnValue = [StripContext, StripContext];

function defaultSliceStrip() {
  return true;
}

/**
 * Returns an iterable that outputs pairs of strips that have the same length.
 */
export function twoStripsParallelIterable(
  strips1: Strip[],
  strips2: Strip[],
  options?: {
    /**
     * Customize handler fot getting strip length
     * Useful for including DeleteStrip length which is 0 by default
     */
    getLength?: typeof getDefaultStripLength;
    /**
     * @returns True to slice strip to match parallel strip length
     */
    sliceStrip?: (strip: Strip) => boolean;
  }
): Iterable<ReturnValue, ReturnValue> {
  const getLength = options?.getLength ?? getDefaultStripLength;
  const sliceStrip = options?.sliceStrip ?? defaultSliceStrip;

  const remainingStrips1 = [...strips1].reverse();
  const remainingStrips2 = [...strips2].reverse();
  let wasNextInvoked = true;

  function peekStrips1() {
    return remainingStrips1[remainingStrips1.length - 1];
  }

  function peekStrips2() {
    return remainingStrips2[remainingStrips2.length - 1];
  }

  function getCurrentStripPair(): [StripValue, StripValue] | undefined {
    while (remainingStrips1.length > 0 || remainingStrips2.length > 0) {
      const strip1 = peekStrips1();
      if (strip1 === undefined) {
        const strip2 = peekStrips2();
        if (strip2 === undefined) {
          return;
        }

        const len2 = getLength(strip2);
        if (len2 <= 0) {
          remainingStrips2.pop();
          continue;
        }

        return [undefined, strip2];
      }

      const len1 = getLength(strip1);
      if (len1 <= 0) {
        remainingStrips1.pop();
        continue;
      }

      const strip2 = peekStrips2();
      if (strip2 === undefined) {
        return [strip1, undefined];
      }

      const len2 = getLength(strip2);
      if (len2 <= 0) {
        remainingStrips2.pop();
        continue;
      }

      const lenMin = Math.min(len1, len2);

      let outStrip1: Strip;
      if (sliceStrip(strip1)) {
        const slicedStrip1 = [
          strip1.slice(lenMin, len1),
          strip1.slice(0, lenMin),
        ] as const;
        remainingStrips1.splice(remainingStrips1.length - 1, 1, ...slicedStrip1);
        outStrip1 = slicedStrip1[1];
      } else {
        outStrip1 = strip1;
      }

      let outStrip2: Strip;
      if (sliceStrip(strip2)) {
        const slicedStrip2 = [
          strip2.slice(lenMin, len2),
          strip2.slice(0, lenMin),
        ] as const;
        remainingStrips2.splice(remainingStrips2.length - 1, 1, ...slicedStrip2);
        outStrip2 = slicedStrip2[1];
      } else {
        outStrip2 = strip2;
      }

      return [outStrip1, outStrip2];
    }

    return;
  }

  function next1() {
    wasNextInvoked = true;
    remainingStrips1.pop();
  }

  function next2() {
    wasNextInvoked = true;
    remainingStrips2.pop();
  }

  return {
    [Symbol.iterator]: () => ({
      next() {
        if (!wasNextInvoked) {
          throw new Error(`twoStripsParallelIterable strip "next" wasn't invoked`);
        }
        wasNextInvoked = false;
        const currentStripPair = getCurrentStripPair();
        if (!currentStripPair) {
          return {
            value: [
              {
                strip: undefined,
                next: next1,
              },
              {
                strip: undefined,
                next: next2,
              },
            ],
            done: true,
          };
        }

        return {
          value: [
            {
              strip: currentStripPair[0],
              next: next1,
            },
            {
              strip: currentStripPair[1],
              next: next2,
            },
          ],
          done: false,
        };
      },
    }),
  };
}
