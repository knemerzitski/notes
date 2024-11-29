import styled from '@emotion/styled';
import { Button, ButtonProps } from '@mui/material';
import { useOnClose } from '../../utils/context/on-close';

export function CloseButton(props: Omit<ButtonProps, 'onClick'>) {
  const onClose = useOnClose();

  function handleClick() {
    onClose();
  }

  return <ButtonStyled {...props} onClick={handleClick} />;
}

const ButtonStyled = styled(Button)();

CloseButton.defaultProps = {
  size: 'small',
  children: 'Close',
};
