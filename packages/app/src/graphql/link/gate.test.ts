import { ApolloLink, execute, GraphQLRequest, Observable } from '@apollo/client';
import { it, expect, vi } from 'vitest';
import { GateLink } from './gate';
import { Kind } from 'graphql';

// TODO as general testing utility?
async function runLink(link: ApolloLink, inputValues: string[]) {
  const mockLink = new ApolloLink((op) => {
    return new Observable((observer) => {
      observer.next({
        data: op.getContext().data,
      });
    });
  });

  const values: unknown[] = [];
  await Promise.all(
    inputValues
      .map(
        (value) =>
          ({
            query: {
              kind: Kind.DOCUMENT,
              definitions: [],
            },
            context: {
              data: value,
              getUserGate: vi.fn(),
            },
          }) satisfies GraphQLRequest
      )
      .map((op) => {
        return new Promise<void>((res) => {
          execute(link.concat(mockLink), op).subscribe({
            next(value) {
              values.push(value.data);
              res();
            },
          });
        });
      })
  );

  return values;
}

it('forwards operations based on filtered gates', async () => {
  const gateLink = new GateLink();

  const gateGlobal = gateLink.create();
  const gateStartA = gateLink.create((op) => {
    const data = op.getContext().data;
    if (typeof data !== 'string') {
      return false;
    }
    return data.startsWith('a');
  });
  const gateEndB = gateLink.create((op) => {
    const data = op.getContext().data;
    if (typeof data !== 'string') {
      return false;
    }
    return data.endsWith('b');
  });

  gateGlobal.close();
  gateStartA.close();
  gateEndB.close();

  setTimeout(() => {
    // global
    gateGlobal.open();

    // a1, a2
    gateStartA.open();
    gateStartA.close();

    // 1b, 2b
    gateEndB.open();

    // ab
    gateStartA.open();
  }, 0);

  await expect(
    runLink(gateLink, ['global', 'a1', '1b', 'ab', 'a2', '2b'])
  ).resolves.toStrictEqual(['global', 'a1', 'a2', '1b', '2b', 'ab']);
});
