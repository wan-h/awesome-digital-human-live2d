'use client'

import React from "react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@nextui-org/react";
import Gallery from "@/app/ui/home/gallery";
import Settings from "@/app/ui/home/settings";
import Github from "./github";

export function PhoneMenu() {
  return (
    <Dropdown>
      <DropdownTrigger>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </DropdownTrigger>
      <DropdownMenu aria-label="Static Actions">
        <DropdownItem isReadOnly textValue="gallery">
          <Gallery/>
        </DropdownItem>
        <DropdownItem isReadOnly textValue="settings">
          <Settings/>
        </DropdownItem>
        <DropdownItem isReadOnly textValue="github">
          <Github/>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

export function WindowMenu() {
  return (
    <div className="flex flex-no-wrap items-center justify-center text-xs md:text-base">
      <div className="mr-5 hover:text-gray-900 cursor-pointer">
        <Gallery/>
      </div>
      <div className="mr-5 hover:text-gray-900 cursor-pointer">
        <Settings/>
      </div>
    </div>
  );
}