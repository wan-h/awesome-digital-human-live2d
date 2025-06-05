'use server';

import {cookies} from 'next/headers';
import {Locale, locales, defaultLocale} from '@/i18n/config';

// In this example the locale is read from a cookie. You could alternatively
// also read it from a database, backend service, or any other source.
const COOKIE_NAME = 'NEXT_LOCALE';

export async function getUserLocale() {
    const c = await cookies();
    const cookieLocale = c.get(COOKIE_NAME)?.value;
    
    if (!cookieLocale) {
        return defaultLocale;
    }
    
    // 使用类型守卫确保类型安全
    const isValidLocale = (locale: string): locale is Locale => {
        return locales.includes(locale as Locale);
    };
    
    return isValidLocale(cookieLocale) ? cookieLocale : defaultLocale;
}

export async function setUserLocale(locale: Locale) {
    const c = await cookies();
    c.set(COOKIE_NAME, locale);
}