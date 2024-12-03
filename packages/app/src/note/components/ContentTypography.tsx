import { styled, Typography } from '@mui/material';

import { gql } from '../../__generated__';
import { NoteTextFieldName } from '../../__generated__/graphql';
import { useTextFieldValue } from '../hooks/useTextFieldValue';

const _ContentTypography_NoteFragment = gql(`
  fragment ContentTypography_NoteFragment on Note {
    ...UseTextFieldValue_NoteFragment
  }
`);

export function ContentTypography() {
  const value = useTextFieldValue(NoteTextFieldName.CONTENT) ?? '';

  return <TypographyStyled>{value}</TypographyStyled>;
}

// TODO add gradient fade for last line of text
const TypographyStyled = styled(Typography)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'pre-wrap',
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: '7',
  textAlign: 'left',
  flex: '1 1 100%',
  userSelect: 'none',
});
