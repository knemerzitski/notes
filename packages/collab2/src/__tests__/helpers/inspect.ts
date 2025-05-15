/* eslint-disable @typescript-eslint/unbound-method */
import { inspect, CustomInspectFunction } from 'util';

import { RetainStrip, InsertStrip, RemoveStrip, Changeset } from '../../common/changeset';
import { Selection } from '../../common/selection';

declare module '../../common/changeset' {
  interface Changeset {
    [inspect.custom]: CustomInspectFunction;
  }
  interface Strip {
    [inspect.custom]: CustomInspectFunction;
  }
}

declare module '../../common/selection' {
  interface Selection {
    [inspect.custom]: CustomInspectFunction;
  }
}

Changeset.prototype[inspect.custom] = function (_depth, { stylize }) {
  return (
    `(${stylize(String(this.inputLength), 'number')} -> ${stylize(String(this.outputLength), 'number')})` +
    (this.isEmpty()
      ? stylize('∅', 'undefined')
      : `[${this.strips.map((value) => inspect(value, false, null, true)).join(', ')}]`)
  );
};

InsertStrip.prototype[inspect.custom] = function (_depth, { stylize }) {
  return stylize(this.isEmpty() ? '∅' : JSON.stringify(this.value), 'string');
};

RetainStrip.prototype[inspect.custom] = function (_depth, { stylize }) {
  if (this.length > 1) {
    return `${stylize(String(this.start), 'number')} - ${stylize(
      String(this.end - 1),
      'number'
    )}`;
  } else if (this.length === 1) {
    return stylize(String(this.start), 'number');
  }

  return stylize('∅', 'number');
};

RemoveStrip.prototype[inspect.custom] = function (_depth, { stylize }) {
  if (this.length > 1) {
    return `${stylize(String(this.start), 'regexp')} - ${stylize(
      String(this.end - 1),
      'regexp'
    )}`;
  } else if (this.length === 1) {
    return stylize(String(this.start), 'regexp');
  }

  return stylize('∅', 'regexp');
};

Selection.prototype[inspect.custom] = function (_depth, { stylize }) {
  return stylize(this.toString(), 'special');
};
