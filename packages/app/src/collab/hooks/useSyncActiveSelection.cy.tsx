/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  InMemoryCache,
  ApolloClient,
  NormalizedCacheObject,
  ApolloProvider,
} from '@apollo/client';
import { createCache } from '../../test/helpers/apollo-client';
import useSyncActiveSelection, { FRAGMENT } from './useSyncActiveSelection';
import { FormEventHandler, useState } from 'react';


let cache: InMemoryCache;
let client: ApolloClient<NormalizedCacheObject>;

let collabTextId: string;
let collabTextRef: string | undefined;

describe('useSyncActiveSelection', () => {
  beforeEach(() => {
    cache = createCache();
    client = new ApolloClient({
      cache,
    });

    collabTextId = '1';
    collabTextRef = cache.identify({
      id: collabTextId,
      __typename: 'CollabText',
    })!;

    cache.restore({
      [collabTextRef]: {
        __typename: 'CollabText',
        activeSelection: {
          start: 0,
          end: null,
        },
      },
    });
  });

  function TestInput() {
    const [text, setText] = useState('initial text');

    const { inputRef, handleSelect } = useSyncActiveSelection(collabTextId);

    const handleInput: FormEventHandler<HTMLInputElement> = (e) => {
      if (
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLInputElement)
      ) {
        return;
      }
      e.preventDefault();

      const value = e.target.value;
      setText(value);
    };

    return (
      <div>
        <input
          ref={inputRef}
          onSelect={handleSelect}
          value={text}
          onInput={handleInput}
        />
      </div>
    );
  }

  it('updates cache activeSelection', () => {
    cy.mount(
      <ApolloProvider client={client}>
        <TestInput />
      </ApolloProvider>
    );

    cy.get('input').type('write');

    cy.then(() => {
      const collabText = cache.readFragment({
        id: collabTextRef,
        fragment: FRAGMENT,
      });
      expect(collabText?.activeSelection).deep.equal({
        start: 17,
        end: null,
      });
    });
  });
});
