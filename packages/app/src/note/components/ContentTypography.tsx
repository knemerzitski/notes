import { css, styled, Theme, Typography } from '@mui/material';

import { gql } from '../../__generated__';
import { NoteTextFieldName } from '../../__generated__/graphql';
import { useTextFieldValue } from '../hooks/useTextFieldValue';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';

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

export function ContentTypography(props: TypographyStyledProps) {
  const value = useTextFieldValue(NoteTextFieldName.CONTENT) ?? '';

  return (
    <TypographyStyled bottomGradient={props.bottomGradient}>{value}</TypographyStyled>
  );
}

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
