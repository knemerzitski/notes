import { Button, ButtonProps } from '@mui/material';

import { forwardRef } from 'react';

import { useOnClose } from '../../utils/context/on-close';

export const CloseButton = forwardRef<HTMLButtonElement, ButtonProps>(
  function CloseButton(
    { size = 'small', children = 'Close', ...restProps }: ButtonProps,
    ref
  ) {
    const onClose = useOnClose();

    const handleClick: ButtonProps['onClick'] = function (e) {
      restProps.onClick?.(e);
      onClose();
    };

    return (
      <Button
        ref={ref}
        size={size}
        aria-label="close"
        {...restProps}
        onClick={handleClick}
      >
        {children}
      </Button>
    );
  }
);
