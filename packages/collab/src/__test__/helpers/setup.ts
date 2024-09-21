import util, { InspectOptionsStylized } from 'util';

import { Strips, RetainStrip, InsertStrip, Changeset, Strip } from '../../changeset';

/**
 * Display Changeset as a stylized string
 */

// @ts-expect-error "Dynamic injection"
Changeset.prototype[util.inspect.custom] = function (
  _depth: number,
  { stylize }: InspectOptionsStylized
) {
  const stripsStr = util.inspect(this.strips, false, null, true);
  return `(${stylize(String(this.strips.maxIndex + 1), 'number')} -> ${stylize(
    String(this.strips.length),
    'number'
  )})${stripsStr}`;
};

// @ts-expect-error "Dynamic injection"
Strips.prototype[util.inspect.custom] = function () {
  return `[${this.values
    .map((value) => util.inspect(value, false, null, true))
    .join(', ')}]`;
};

// @ts-expect-error "Dynamic injection"
InsertStrip.prototype[util.inspect.custom] = function (
  _depth: number,
  { stylize }: InspectOptionsStylized
) {
  return stylize(`"${this.value}"`, 'string');
};

// @ts-expect-error "Dynamic injection"
RetainStrip.prototype[util.inspect.custom] = function (
  _depth: number,
  { stylize }: InspectOptionsStylized
) {
  return this.startIndex !== this.endIndex
    ? `${stylize(String(this.startIndex), 'number')} - ${stylize(
        String(this.endIndex),
        'number'
      )}`
    : stylize(String(this.startIndex), 'number');
};

// @ts-expect-error "Dynamic injection"
Strip.EMPTY.__proto__[util.inspect.custom] = function (
  _depth: number,
  { stylize }: InspectOptionsStylized
) {
  return stylize(this.toString(), 'undefined');
};
