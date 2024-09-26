'use client'

import React, { useState } from "react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@nextui-org/react";
import Gallery from "@/app/ui/home/gallery";
import Settings from "@/app/ui/home/settings";
import Github from "./github";

export function PhoneMenu() {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <>
    <Dropdown>
      <DropdownTrigger>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </DropdownTrigger>
      <DropdownMenu aria-label="Static Actions" onAction={(key) => {
        if (key === 'gallery') {
          setGalleryOpen(true);
        } else if (key === 'settings') {
          setSettingsOpen(true);
        }
      }}>
        <DropdownItem key="gallery" textValue="gallery">
          Gallery
        </DropdownItem>
        <DropdownItem key="settings" textValue="settings">
          Settings
        </DropdownItem>
        <DropdownItem textValue="github">
          <Github/>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
    <Gallery isOpen={galleryOpen} onClose={() => setGalleryOpen(false)} />
    <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

export function WindowMenu() {
  return (
    <div className="flex flex-no-wrap items-center justify-center text-xs md:text-base">
      <div className="mr-5 hover:text-gray-900 cursor-pointer">
        <Gallery trigger={'Gallery'}/>
      </div>
      <div className="mr-5 hover:text-gray-900 cursor-pointer">
        <Settings trigger={'Settings'}/>
      </div>
    </div>
  );
}