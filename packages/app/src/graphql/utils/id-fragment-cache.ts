import { DocumentNode, gql } from '@apollo/client';

let uniqueId = 0;

export class IdFragmentCache {
  private readonly fragmentByTypename = new Map<string, DocumentNode>();

  private readonly uniqueId;

  constructor() {
    this.uniqueId = String(uniqueId++);
  }

  get(typename: string) {
    let fragment = this.fragmentByTypename.get(typename);
    if (!fragment) {
      fragment = gql(createIdFragmentFromString(typename, this.uniqueId));
      this.fragmentByTypename.set(typename, fragment);
    }
    return fragment;
  }

  delete(typename: string) {
    this.fragmentByTypename.delete(typename);
  }
}

function createIdFragmentFromString(typename: string, uniqueId: string) {
  return `
    fragment ${typename}IdFragmentCache${uniqueId} on ${typename} {
      id
    }
  `;
}
