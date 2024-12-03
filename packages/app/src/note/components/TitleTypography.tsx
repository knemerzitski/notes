import { styled, Typography } from '@mui/material';

import { gql } from '../../__generated__';
import { NoteTextFieldName } from '../../__generated__/graphql';
import { useTextFieldValue } from '../hooks/useTextFieldValue';

const _TitleTypography_NoteFragment = gql(`
  fragment TitleTypography_NoteFragment on Note {
    ...UseTextFieldValue_NoteFragment
  }
`);

export function TitleTypography() {
  const value = useTextFieldValue(NoteTextFieldName.TITLE);

  if (!value) {
    return null;
  }

  return <TypographyStyled>{value}</TypographyStyled>;
}

const TypographyStyled = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightMedium,
  fontSize: '1.2em',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: '1 0 auto',
  userSelect: 'none',
}));
