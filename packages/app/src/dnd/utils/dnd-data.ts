import { Data } from '@dnd-kit/core';

import { DndData } from '../types';

export function getDndData(
  data: React.MutableRefObject<Data | undefined> | undefined
): DndData | undefined {
  if (!data?.current) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const type = data.current.type;
  if (typeof type === 'string') {
    return data.current as DndData;
  }

  return;
}

export function setDndData(dndData: DndData, data?: Data): Data {
  return {
    ...data,
    ...dndData,
  };
}
