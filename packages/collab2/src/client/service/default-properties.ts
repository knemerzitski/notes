import { MutableComputedState } from './computed-state';
import { StructSerializer } from './struct-serializer';
import { Context, Properties } from './types';
import { nanoid } from 'nanoid';
import { ServerFacades } from './utils/server-facades';

const defaultContext: Context = {
  generateSubmitId: () => nanoid(6),
  isExternalTypingHistory: () => false,
  historySizeLimit: 100,
  arrayCleanupThreshold: 32,
  serializer: new StructSerializer(),
};

export function createDefaultProperties(): Properties {
  return {
    state: new MutableComputedState(),
    context: defaultContext,
    serverFacades: new ServerFacades(new Set()),
  };
}
