import { useEffect } from 'react';
import eruda from 'eruda';
import { useLocalStorage } from 'react-use';
import { useSearchParams } from 'next/navigation';

export const useDebug = () => {
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug');
  const isLocalDebug = window.location.href.includes('localhost');
  const [debug] = useLocalStorage('debug', isDebug || isLocalDebug);

  useEffect(() => {
    if (debug) {
      eruda.init();
    }
  }, [debug]);

  return {
    debug
  };
};
