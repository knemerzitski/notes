import { DocumentTransform } from '@apollo/client';
import { visit } from 'graphql';

import { getActiveSessionType } from '../persistence';

export const sessionDocumentTransform = new DocumentTransform(
  (document) => {
    const transformedDocument = visit(document, {
      Directive: {
        enter(directive) {
          if (directive.name.value === 'session') {
            if (getActiveSessionType() === 'LocalSession') {
              // For local session replace @session with @client directive
              return {
                ...directive,
                name: {
                  ...directive.name,
                  value: 'client',
                },
              };
            } else {
              // For remote session remove @session directive
              return null;
            }
          }
        },
      },
    });
    return transformedDocument;
  },
  {
    getCacheKey(document) {
      return [document, getActiveSessionType() === 'LocalSession'];
    },
  }
);
