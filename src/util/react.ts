import { useCallback, useRef } from 'react';

const useRefMap = <T>() => {
  const itemsRef = useRef(new Map<string | number, T>());

  const setRef = useCallback(
    (key: string | number) => (node: T) => {
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
