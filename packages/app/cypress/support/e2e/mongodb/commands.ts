import { CollectionName } from '../../../../../api/src/mongodb/collection-names';

import { DBFindOneFn, MongoDBTasks } from './setup';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      resetDatabase: typeof resetDatabase;
      dbFindOne: typeof dbFindOne;
    }
  }
}

function resetDatabase() {
  return cy.task<Awaited<ReturnType<MongoDBTasks['resetDatabase']>>>('resetDatabase');
}
Cypress.Commands.add('resetDatabase', resetDatabase);

function dbFindOne<T extends CollectionName>(options: Parameters<DBFindOneFn<T>>[0]) {
  return cy.task<Awaited<ReturnType<DBFindOneFn<T>>>>('dbFindOne', options);
}
Cypress.Commands.add('dbFindOne', dbFindOne);
