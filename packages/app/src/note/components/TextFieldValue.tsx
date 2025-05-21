import { ReactNode, useEffect, useState } from 'react';

import { useCollabServiceManager } from '../context/collab-service-manager';
import { useUserNoteLinkId } from '../context/user-note-link-id';
import { useCacheViewTextFieldValue } from '../hooks/useCacheViewTextFieldValue';
import { useTextFieldValue } from '../hooks/useTextFieldValue';
import { NoteTextFieldName } from '../types';

export function TextFieldValue(props: {
  fieldName: NoteTextFieldName;
  render?: (value: string) => ReactNode;
}) {
  const userNoteLinkId = useUserNoteLinkId();
  const collabServiceManager = useCollabServiceManager();
  const facadeGetter = collabServiceManager.getOrCreate(userNoteLinkId);

  const [isPending, setIsPending] = useState(facadeGetter.initStatus.isPending);

  useEffect(() => {
    void facadeGetter.initStatus.completion.then(() => {
      setIsPending(false);
    });
  }, [facadeGetter]);

  return isPending ? (
    <CacheViewTextParseField {...props} />
  ) : (
    <CollabManagerFieldValue {...props} />
  );
}

function CacheViewTextParseField({
  fieldName,
  render,
}: Parameters<typeof TextFieldValue>[0]) {
  const value = useCacheViewTextFieldValue(fieldName);

  if (value === null) {
    return;
  }

  if (render) {
    return render(value);
  }

  return value;
}

function CollabManagerFieldValue({
  fieldName,
  render,
}: Parameters<typeof TextFieldValue>[0]) {
  const value = useTextFieldValue(fieldName);

  if (render) {
    return render(value);
  }

  return value;
}
