import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { IconButton, IconButtonProps } from '@mui/material';
import { useOnClose } from '../context/on-close';
import { forwardRef } from 'react';

export const BackCloseIconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function BackCloseIconButton(props, ref) {
    const onClose = useOnClose();

    const handleClick: IconButtonProps['onClick'] = function (e) {
      props.onClick?.(e);
      onClose();
    };

    return (
      <IconButton ref={ref} {...props} onClick={handleClick}>
        <ArrowBackIcon />
      </IconButton>
    );
  }
);
