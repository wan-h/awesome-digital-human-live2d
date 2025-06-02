'use client'

import { useState } from "react";
import { 
    Dropdown, 
    DropdownMenu,
    DropdownItem, 
    DropdownTrigger, 
    Button
} from "@heroui/react";
import { GithubIcon } from '@/components/icons/github';
import { 
    Cog8ToothIcon, 
    ChevronDownIcon, 
    Bars3Icon, 
    PhotoIcon, 
    AcademicCapIcon
} from "@heroicons/react/24/solid";
import { useTranslations } from 'next-intl';
import { SENTIO_GITHUB_URL, SENTIO_GUIDE_URL } from '@/lib/constants';
import { Settings } from "./settings";
import { Gallery } from "./gallery";


export function Items() {
    const t = useTranslations('Products.sentio.items');
    const [isOpen, setIsOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    return (
        <div>
            <Dropdown 
                placement="bottom-start"
                onOpenChange={(isOpen) => setIsOpen(isOpen)}
            >
                <DropdownTrigger>
                    <Button
                        isIconOnly
                        variant="light"
                    > 
                        {isOpen? <ChevronDownIcon className="size-6"/> : <Bars3Icon className="size-6"/>}
                    </Button>

                </DropdownTrigger>
                <DropdownMenu
                    aria-label="Items Actions" 
                    variant="flat"
                >   
                    <DropdownItem 
                        key="setting"
                        startContent={<Cog8ToothIcon className="size-6"/>}
                        onPress={() => setIsSettingsOpen(true)}
                    >
                        {t('setting')}
                    </DropdownItem>

                    <DropdownItem 
                        key="gallery"
                        startContent={<PhotoIcon className="size-6"/>}
                        onPress={() => setIsGalleryOpen(true)}
                    >
                        {t('gallery')}
                    </DropdownItem>

                    <DropdownItem 
                        key="guide"
                        startContent={<AcademicCapIcon className="size-6"/>}
                        onPress={() => window.open(SENTIO_GUIDE_URL, '_blank')}
                    >
                        {t('guide')}
                    </DropdownItem>

                    <DropdownItem 
                        key="open"
                        startContent={<GithubIcon className="size-6"/>}
                        onPress={() => window.open(SENTIO_GITHUB_URL, '_blank')}
                    >
                        {t('open')}
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
            <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}/>
            <Gallery isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)}/>
        </div>
    )
}