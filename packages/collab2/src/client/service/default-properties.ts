import { nanoid } from 'nanoid';

import { MutableComputedState } from './computed-state';
import { StructSerializer } from './struct-serializer';
import { Context, Properties } from './types';

const defaultContext: Context = {
  generateSubmitId: () => nanoid(6),
  historySizeLimit: 100,
  arrayCleanupThreshold: 32,
  serializer: new StructSerializer(),
};

export function createDefaultProperties(): Properties {
  return {
    state: new MutableComputedState(),
    context: defaultContext,
    isExternalTypingHistory: () => false,
    serverFacade: null,
  };
}
