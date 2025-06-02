import React from 'react';
import { Tooltip } from '@heroui/react';
import { InformationCircleIcon } from "@heroicons/react/24/outline";

export function InfoTip(props: {
    content: React.ReactNode
}) {
    return (
        <Tooltip
            className="px-1.5 text-tiny text-default-600 rounded-small"
            content={props.content}
            placement="right"
        >
            <span className="transition-opacity opacity-80 hover:opacity-100">
                <InformationCircleIcon className="size-5" />
            </span>
        </Tooltip>
    )
}