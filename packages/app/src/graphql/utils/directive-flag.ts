import { DocumentNode, Operation } from '@apollo/client';
import { hasDirectives, removeDirectivesFromDocument } from '@apollo/client/utilities';
import { memoize1 } from '~utils/memoize1';

export class DirectiveFlag {
  private readonly transformRemove;

  constructor(private readonly directiveName: string) {
    this.transformRemove = memoize1((document: DocumentNode) => {
      return (
        removeDirectivesFromDocument(
          [
            {
              name: this.directiveName,
            },
          ],
          document
        ) ?? document
      );
    });
  }

  has(operation: Pick<Operation, 'query'>): boolean {
    return hasDirectives([this.directiveName], operation.query);
  }

  remove(operation: Pick<Operation, 'query'>) {
    if (this.has(operation)) {
      operation.query = this.transformRemove(operation.query);
    }
  }
}
