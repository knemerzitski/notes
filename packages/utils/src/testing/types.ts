export type FetchFn = (options: {
  readonly url: string;
  readonly method: string;
  readonly headers?: Record<string, string>;
  readonly body: string | null;
}) => Promise<{
  readonly json: () => Promise<unknown>;
  readonly headers: {
    readonly entries: readonly [string, string][];
    readonly getSetCookie: () => string[];
  };
  readonly status?: number;
}>;

export interface GraphQLRequest<TVariables> {
  operationName?: string;
  query?: string;
  variables?: TVariables;
}

export interface GenericWebSocket {
  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (event: WebSocketEventMap[K]) => void
  ): void;

  removeEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (event: WebSocketEventMap[K]) => void
  ): void;
  send(data: BufferLike, cb?: (err?: Error) => void): void;
}

export type GenericWebSocketFactory = new (
  url: string | URL,
  options?: {
    readonly protocol?: string;
    readonly headers?: Record<string, string>;
  }
) => GenericWebSocket;

export type BufferLike =
  | string
  | Buffer
  | DataView
  | number
  | ArrayBufferView
  | Uint8Array
  | ArrayBuffer
  | SharedArrayBuffer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | readonly any[]
  | readonly number[]
  | { valueOf(): ArrayBuffer }
  | { valueOf(): SharedArrayBuffer }
  | { valueOf(): Uint8Array }
  | { valueOf(): readonly number[] }
  | { valueOf(): string }
  | { [Symbol.toPrimitive](hint: string): string };

export interface WebSocketEventMap {
  open: Event;
  error: ErrorEvent;
  close: CloseEvent;
  message: MessageEvent;
}

interface Event {
  type: string;
  target: GenericWebSocket;
}

interface MessageEvent {
  data: Data;
  type: string;
  target: GenericWebSocket;
}

type Data = string | Buffer | ArrayBuffer | Buffer[];

interface CloseEvent {
  wasClean: boolean;
  code: number;
  reason: string;
  type: string;
  target: GenericWebSocket;
}

interface ErrorEvent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any;
  message: string;
  type: string;
  target: GenericWebSocket;
}
