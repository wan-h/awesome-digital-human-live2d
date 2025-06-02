'use client'

import { useState } from "react"
import { Slider, Tooltip } from "@heroui/react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

export function ValueSlider(
    props: {
        label: string,
        description: string,
        maxValue: number,
        minValue: number,
        step: number,
        defaultValue: number,
        onChange: (value: number) => void
    }
) {
    const [value, setValue] = useState(props.defaultValue);
    const [inputValue, setInputValue] = useState(props.defaultValue.toString());

    const handleChange = (value: number | number[]) => {
        if (isNaN(Number(value))) return;
        setValue(value as number);
        setInputValue(value.toString());
        props.onChange(value as number);
    };

    const contentRender = () => {
        return (
            <span>{props.description}</span>
        )
    }

    return (
        <Slider
            className="max-w-md p-1"
            classNames={{
                base: "max-w-md",
                label: "text-medium",
            }}
            name={props.label}
            label={props.label}
            key={props.label}
            maxValue={props.maxValue}
            minValue={props.minValue}
            renderLabel={({ children, ...props }) => (
                <label {...props} className="text-medium flex gap-2 items-center">
                    {children}
                    <Tooltip
                        className="px-1.5 text-tiny text-default-600 rounded-small"
                        content={contentRender()}
                        placement="right"
                    >
                        <span className="transition-opacity opacity-80 hover:opacity-100">
                            <InformationCircleIcon className="size-5" />
                        </span>
                    </Tooltip>
                </label>
            )}
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderValue={({ children, ...props }) => (
                <output {...props}>
                    <Tooltip
                        className="text-tiny text-default-500 rounded-md"
                        content="Press Enter to confirm"
                        placement="left"
                    >
                        <input
                            aria-label="Input value"
                            className="px-1 py-0.5 w-12 text-right text-small text-default-700 font-medium bg-default-100 outline-none transition-colors rounded-small border-medium border-transparent hover:border-primary focus:border-primary"
                            type="text"
                            value={inputValue}
                            onChange={(e) => {
                                const v = e.target.value;
                                setInputValue(v);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !isNaN(Number(inputValue))) {
                                    handleChange(Number(inputValue));
                                }
                            }}
                        />
                    </Tooltip>
                </output>
            )}
            // we extract the default children to render the input
            step={props.step}
            value={value}
            onChange={handleChange}
        />
    );
}

