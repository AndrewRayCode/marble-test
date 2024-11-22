import { useCallback, useRef } from 'react';

const useRefMap = () => {
  const itemsRef = useRef(new Map());

  const setRef = useCallback(
    (key: string | number) => (node: unknown) => {
      if (node) {
        itemsRef.current.set(key, node);
      } else {
        itemsRef.current.delete(key);
      }
    },
    [],
  );

  return [itemsRef.current, setRef] as const;
};

export { useRefMap };
