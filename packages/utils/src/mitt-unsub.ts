import originalMitt, {
  EventType,
  Handler,
  WildcardHandler,
  EventHandlerMap,
  Emitter as OriginalEmitter,
} from 'mitt';

export * from 'mitt';

export type Emitter<Events extends Record<EventType, unknown>> = Omit<
  OriginalEmitter<Events>,
  'on'
> & {
  on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): () => void;
  on(type: '*', handler: WildcardHandler<Events>): () => void;
};

/**
 * Mitt that returns a unsubscribe function when calling on.
 * @see {@link originalMitt}
 */
export default function mitt<Events extends Record<EventType, unknown>>(
  all?: EventHandlerMap<Events>
): Emitter<Events> {
  const bus = originalMitt(all);

  return {
    ...bus,
    on: (...args: unknown[]) => {
      // @ts-expect-error Correct typing is in return value
      bus.on(...args);

      return () => {
        // @ts-expect-error Correct typing is in return value
        bus.off(...args);
      };
    },
  };
}
