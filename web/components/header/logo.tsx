import { Link } from "@heroui/react";
import { LogoIcon } from "@/components/icons/logo";
import { useTranslations } from 'next-intl';
import { hongLei } from '@/lib/font';
import clsx from "clsx";


export function LogoBar(props: {isExternal: boolean}) {
    const t = useTranslations('Metadata');
    return (
        <div className="flex items-center">
            <Link href="https://www.light4ai.com" isExternal={props.isExternal} className="font-bold text-inherit">
                <div className="flex items-center gap-1 justify-center">
                    <LogoIcon className="size-8 text-red-600" />
                    <p className={clsx(hongLei.className,"invisible md:visible text-2xl")}>{t('title')}</p>
                </div>
            </Link>
        </div>
    )
}