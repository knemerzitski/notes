import { Data, DataRef } from '@dnd-kit/core';
import { ReactNode } from 'react';

import { isObjectLike } from '../../../../utils/src/type-guards/is-object-like';
import { Maybe } from '../../../../utils/src/types';

const DATA_KEY = 'dragOverlay';

export interface DndDataDragOverlayOptions {
  /**
   * Overlay to be rendered
   */
  element: ReactNode;
}

export function setDragOverlayInDndData(
  value: DndDataDragOverlayOptions,
  data?: Data
): Data {
  return {
    ...data,
    [DATA_KEY]: value,
  };
}

function getDragOverlayDndData(
  data: React.MutableRefObject<Data | undefined> | undefined
): DndDataDragOverlayOptions | undefined {
  if (!data?.current) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const value = data.current[DATA_KEY];
  if (isObjectLike(value) && 'element' in value) {
    return value as unknown as DndDataDragOverlayOptions;
  }

  return;
}

export function renderDragOverlayFromDndData(data: Maybe<DataRef>) {
  if (!data) {
    return null;
  }

  const componentData = getDragOverlayDndData(data);

  if (!componentData) {
    return null;
  }

  const { element } = componentData;

  return element;
}
