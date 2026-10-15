import Image from "next/image";
import Link from "next/link";

export default function Logo() {
    return (
        <Link href="/" className="inline-flex items-center">
            <Image
                src="/logo.png"
                alt="Austra Training Institute"
                width={96}
                height={48}
                priority
                className="h-12 w-auto"
            />
        </Link>
    );
}