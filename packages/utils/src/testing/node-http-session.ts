import { HttpSession } from './http-session';
import { nodeFetch } from './node-fetch';

export class NodeHttpSession extends HttpSession {
  constructor(options?: Omit<ConstructorParameters<typeof HttpSession>[0], 'fetchFn'>) {
    super({
      ...options,
      fetchFn: nodeFetch,
    });
  }
}
