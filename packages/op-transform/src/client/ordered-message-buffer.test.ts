import mitt from 'mitt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderedMessageBuffer } from './ordered-message-buffer';

describe('OrderedMessageBuffer', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  type Messages = {
    text: string;
    numbered: {
      count: number;
      info: string;
    };
    empty: never;
  };

  const textHandler = vi.fn<[Messages['text']], void>();
  const messageBus = mitt<Messages>();
  messageBus.on('text', textHandler);

  let buffer: OrderedMessageBuffer<Messages>;

  beforeEach(() => {
    buffer = new OrderedMessageBuffer({ initialVersion: 0, bus: messageBus });
    textHandler.mockClear();
  });

  it('stashes newer messages until next one arrives', () => {
    expect(textHandler).not.toHaveBeenCalled();
    buffer.add('text', 4, 'future message');
    expect(textHandler).not.toHaveBeenCalled();
    buffer.add('text', 2, 'second');
    expect(textHandler).not.toHaveBeenCalled();
    buffer.add('text', 1, 'first');
    expect(textHandler.mock.calls).toStrictEqual([['first'], ['second']]);
    textHandler.mockClear();
    buffer.add('text', 3, 'third');
    expect(textHandler.mock.calls).toStrictEqual([['third'], ['future message']]);
  });
});
