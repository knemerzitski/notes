import { css, Skeleton, styled, Typography } from '@mui/material';

import { Suspense, useCallback } from 'react';

import { gql } from '../../__generated__';
import { NoteTextFieldName } from '../types';

import { TextFieldValue } from './TextFieldValue';

const _TitleTypography_NoteFragment = gql(`
  fragment TitleTypography_NoteFragment on Note {
    ...UseTextFieldValue_NoteFragment
  }
`);

export function TitleTypography() {
  return (
    <Suspense fallback={<FallbackStyled data-loading="true" />}>
      <Loaded />
    </Suspense>
  );
}

function Loaded() {
  const render = useCallback(
    (value: string) =>
      value && <TypographyStyled aria-label="title">{value}</TypographyStyled>,
    []
  );

  return <TextFieldValue fieldName={NoteTextFieldName.TITLE} render={render} />;
}

const spanStyle = css`
  font-size: 1.2em;
`;

const TypographyStyled = styled(Typography)(spanStyle, ({ theme }) => ({
  fontWeight: theme.typography.fontWeightMedium,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: '1 0 auto',
  userSelect: 'none',
}));

const FallbackStyled = styled(Skeleton)(spanStyle);
