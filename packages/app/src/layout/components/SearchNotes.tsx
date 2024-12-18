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
import { forwardRef } from 'react';

export type SearchNoteProps = Parameters<typeof SearchNotes>[0];

export const SearchNotes = forwardRef<
  HTMLDivElement,
  PaperProps & {
    InputBaseProps?: InputBaseProps;
    IconButtonProps?: IconButtonProps;
  }
>(function SearchNotes({ InputBaseProps, IconButtonProps, ...restProps }, ref) {
  const theme = useTheme();

  const elevation = theme.palette.mode === 'dark' ? 1 : 0;

  return (
    <PaperStyled {...restProps} ref={ref} elevation={elevation}>
      <InputBaseStyled
        placeholder="Search notes"
        {...InputBaseProps}
        inputProps={{
          'aria-label': 'search notes',
          ...InputBaseProps?.inputProps,
        }}
      />
      <SearchIconButtonStyled aria-label="search" {...IconButtonProps}>
        <Tooltip title="Search">
          <SearchIcon />
        </Tooltip>
      </SearchIconButtonStyled>
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
