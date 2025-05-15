import { ReadEmitter, Handler } from 'mitt';

export function mapMitt<T extends object>(
  eventBus: ReadEmitter<T>,
  handlerByName: { [Key in keyof T]?: Handler<T[Key]> }
) {
  const eventsOff = Object.entries(handlerByName).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    ([name, handler]) => eventBus.on(name as any, handler as any)
  );

  return () => {
    eventsOff.forEach((off) => {
      off();
    });
  };
}
