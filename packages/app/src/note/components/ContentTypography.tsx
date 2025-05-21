import { css, Skeleton, styled, Theme, Typography } from '@mui/material';

import { Suspense, useCallback } from 'react';

import { gql } from '../../__generated__';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';
import { NoteTextFieldName } from '../types';

import { TextFieldValue } from './TextFieldValue';

const _ContentTypography_NoteFragment = gql(`
  fragment ContentTypography_NoteFragment on Note {
    ...UseTextFieldValue_NoteFragment
  }
`);

interface TypographyStyledProps {
  bottomGradient?: {
    color: ((theme: Theme) => string) | string;
    height: number;
  };
}

export function ContentTypography(props: Parameters<typeof Loaded>[0]) {
  return (
    <>
      <Suspense fallback={<FallbackStyled data-loading="true" />}>
        <Loaded {...props} />
      </Suspense>
    </>
  );
}

function Loaded(props: TypographyStyledProps) {
  const render = useCallback(
    (value: string) =>
      value && (
        <TypographyStyled aria-label="content" bottomGradient={props.bottomGradient}>
          {value}
        </TypographyStyled>
      ),
    [props.bottomGradient]
  );

  return <TextFieldValue fieldName={NoteTextFieldName.CONTENT} render={render} />;
}

const FallbackStyled = styled(Skeleton)(css`
  flex: 1 1 100%;
`);

const bottomGradient = {
  style: ({ bottomGradient, theme }: TypographyStyledProps & { theme: Theme }) => {
    if (!bottomGradient) {
      return;
    }

    const color =
      typeof bottomGradient.color === 'string'
        ? bottomGradient.color
        : bottomGradient.color(theme);

    return css`
      &::after {
        content: '';

        position: absolute;
        left: 0;
        bottom: 0;
        width: 100%;

        height: ${theme.spacing(bottomGradient.height)};

        background: linear-gradient(0deg, ${color}, transparent);
      }
    `;
  },
  props: ['bottomGradient'],
};

const TypographyStyled = styled(Typography, {
  shouldForwardProp: mergeShouldForwardProp(bottomGradient.props),
})<TypographyStyledProps>(
  {
    position: 'relative',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'pre-wrap',
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: '7',
    textAlign: 'left',
    flex: '1 1 100%',
    userSelect: 'none',
  },
  bottomGradient.style
);
