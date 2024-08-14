import Image from "next/image";

export default function Github() {
    return (
        <a href="https://github.com/wan-h/awesome-digital-human-live2d">
            <Image
                src="/icons/github.svg"
                alt="Github Logo"
                width={30}
                height={30}
            />
        </a>
    );
}