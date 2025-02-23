import SearchIcon from '@mui/icons-material/Search';
import {
  css,
  IconButton,
  IconButtonProps,
  InputBase,
  InputBaseProps,
  Paper,
  PaperProps,
  styled,
  Tooltip,
  useTheme,
} from '@mui/material';
import { ReactNode } from '@tanstack/react-router';
import { forwardRef } from 'react';

export type RouteSearchNotesInputProps = Parameters<typeof RouteSearchNotesInput>[0];

export const RouteSearchNotesInput = forwardRef<
  HTMLDivElement,
  PaperProps & {
    InputBaseProps?: InputBaseProps;
    IconButtonProps?: IconButtonProps;
    /**
     * Disable search icon on the right side of input
     * @default false
     */
    searchIconDisabled?: boolean;
    slots?: {
      prefix?: ReactNode;
      suffix?: ReactNode;
    };
  }
>(function SearchNotesInput(
  { InputBaseProps, IconButtonProps, slots, searchIconDisabled, ...restProps },
  ref
) {
  const theme = useTheme();

  const elevation = theme.palette.mode === 'dark' ? 1 : 0;

  return (
    <PaperStyled {...restProps} ref={ref} elevation={elevation}>
      {slots?.prefix}
      <InputBaseStyled
        placeholder="Search notes"
        {...InputBaseProps}
        inputProps={{
          'aria-label': 'search notes',
          ...InputBaseProps?.inputProps,
        }}
      />
      {!searchIconDisabled && (
        <SearchIconButtonStyled aria-label="search" {...IconButtonProps}>
          <Tooltip title="Search">
            <SearchIcon />
          </Tooltip>
        </SearchIconButtonStyled>
      )}
      {slots?.suffix}
    </PaperStyled>
  );
});

const PaperStyled = styled(Paper)(
  ({ theme }) => css`
    display: flex;
    width: 100%;
    height: 100%;

    padding-left: ${theme.spacing(2)};
    padding-top: ${theme.spacing(0.5)};
    padding-bottom: ${theme.spacing(0.5)};

    border-radius: 9999px;
  `
);

const InputBaseStyled = styled(InputBase)(
  ({ theme }) => css`
    flex: 1;
    padding-right: ${theme.spacing(1)};
  `
);

const SearchIconButtonStyled = styled(IconButton)(
  ({ theme }) => css`
    margin-right: ${theme.spacing(0.5)};
  `
);
