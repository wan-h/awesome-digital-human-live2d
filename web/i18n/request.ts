import {getRequestConfig} from 'next-intl/server';
import {getUserLocale} from '@/lib/locale';

export default getRequestConfig(async () => {
  const locale = await getUserLocale();

  return {
    locale,
    messages: (await import(`./locales/${locale}.json`)).default
  };
});