import { Tooltip, Typography, TypographyProps } from '@mui/material';
import { useDeletedInDays } from '../hooks/useDeletedInDays';
import { gql } from '../../__generated__';

const _DeletedInDays_UserNoteLinkFragment = gql(`
  fragment DeletedInDays_UserNoteLinkFragment on UserNoteLink {
    ...UseDeletedInDays_UserNoteLinkFragment
  }
`);

export function DeletedInDays(props: TypographyProps) {
  const maybeDeletedInDays = useDeletedInDays();
  if (maybeDeletedInDays === false) {
    return null;
  }
  const daysRemaining = maybeDeletedInDays;

  function getDaysRemainingText() {
    if (daysRemaining > 1) {
      return `${daysRemaining} days`;
    } else if (daysRemaining === 1) {
      return '1 day';
    }

    return 'Soon';
  }

  function getDaysRemainingTooltipText() {
    if (daysRemaining < 1) {
      return 'Note will be deleted soon';
    }

    return 'Days remaining until deletion';
  }

  return (
    <Tooltip title={getDaysRemainingTooltipText()}>
      <Typography aria-label="deleted in days" {...props}>
        {getDaysRemainingText()}
      </Typography>
    </Tooltip>
  );
}
