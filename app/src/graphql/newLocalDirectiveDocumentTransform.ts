import { DocumentTransform } from '@apollo/client';
import { visit } from 'graphql';

export default function newLocalDirectiveDocumentTransform() {
  const config = {
    isLocalSession: true,
  };

  const documentTransform = new DocumentTransform(
    (document) => {
      const transformedDocument = visit(document, {
        Directive: {
          enter(directive) {
            if (directive.name.value === 'local') {
              if (config.isLocalSession) {
                // For local account replace local with @client directive
                return {
                  ...directive,
                  name: {
                    ...directive.name,
                    value: 'client',
                  },
                };
              } else {
                // For remote accounts remove @local directive
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
        return [document, config.isLocalSession];
      },
    }
  );

  return {
    documentTransform,
    config,
  };
}
