import { useShowConfirm } from '../../utils/context/show-confirm';

export function confirmUnsavedChanges({
  title,
  condition,
  onSuccess,
  showConfirm,
}: {
  title: string;
  condition: boolean;
  showConfirm: ReturnType<typeof useShowConfirm>;
  onSuccess: () => void;
}) {
  if (condition) {
    showConfirm(
      'You have unsaved changes. If you proceed, changes will be lost forever.',
      {
        title,
        onSuccess,
      }
    );
  } else {
    onSuccess();
  }
}
