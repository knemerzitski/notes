import { useEffect } from 'react';

export function useScript({
  noScript = false,
  ...restProps
}: Pick<HTMLScriptElement, 'src'> &
  Partial<HTMLScriptElement> & {
    noScript?: boolean;
  }) {
  useEffect(() => {
    if (noScript) {
      return;
    }

    const script = document.createElement('script');
    Object.assign(script, restProps);

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [noScript, restProps]);

  return null;
}
