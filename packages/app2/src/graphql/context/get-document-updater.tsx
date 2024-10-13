import { createContext, ReactNode, useContext } from 'react';
import { DocumentUpdaterMap } from '../types';

type ProvidedDocumentUpdaterMap = DocumentUpdaterMap['get'];

const DocumentUpdaterMapContext = createContext<DocumentUpdaterMap['get'] | null>(null);

export function useGetDocumentUpdater(): ProvidedDocumentUpdaterMap {
  const ctx = useContext(DocumentUpdaterMapContext);
  if (ctx === null) {
    throw new Error(
      'useGetDocumentUpdater() requires context <GetDocumentUpdaterProvider>'
    );
  }
  return ctx;
}

export function GetDocumentUpdaterProvider({
  getUpdater,
  children,
}: {
  getUpdater: ProvidedDocumentUpdaterMap;
  children: ReactNode;
}) {
  return (
    <DocumentUpdaterMapContext.Provider value={getUpdater}>
      {children}
    </DocumentUpdaterMapContext.Provider>
  );
}
