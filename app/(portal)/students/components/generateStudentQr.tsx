"use client";

import { useCallback, useMemo, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";

const QR_BASE_URL = "https://austratraininginstitute.co.ke/studentQr/";
const LOGO_SRC = "/logo2.png";

interface GenerateStudentQrProps {
    /** Student email address — encoded into the QR payload. */
    email: string;
    /** Display QR canvas size in px. Defaults to 132 (compact, header-friendly). */
    size?: number;
    /** Resolution multiplier for the downloaded image. Defaults to 4 (e.g. 132px -> 528px high-res image). */
    exportScale?: number;
    className?: string;
}

export default function GenerateStudentQr({
    email,
    size = 132,
    exportScale = 4,
    className = "",
}: GenerateStudentQrProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    /**
     * Target URL: https://austratraininginstitute.co.ke/studentQr/<email>
     */
    const targetUrl = useMemo(
        () => (email ? `${QR_BASE_URL}${encodeURIComponent(email)}` : ""),
        [email],
    );

    /**
     * Render resolution multiplier for screen display (handles 2x/3x Retina screens).
     */
    const displayScale =
        typeof window !== "undefined" ? Math.max(window.devicePixelRatio || 2, 2) : 2;

    /**
     * High-Resolution Export:
     * Draws the canvas onto an enlarged temporary canvas with a solid white
     * background so the resulting PNG is sharp for printing or saving.
     */
    const handleDownload = useCallback(() => {
        if (!email) return;

        const canvas = containerRef.current?.querySelector("canvas");
        if (!canvas) return;

        // Output target dimensions for download
        const renderWidth = size * exportScale;
        const renderHeight = size * exportScale;

        const out = document.createElement("canvas");
        out.width = renderWidth;
        out.height = renderHeight;

        const ctx = out.getContext("2d");
        if (!ctx) return;

        ctx.imageSmoothingEnabled = false;

        // Solid white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, out.width, out.height);

        // Composite current canvas into higher export resolution
        ctx.drawImage(canvas, 0, 0, renderWidth, renderHeight);

        const safeEmail = email.replace(/[^a-z0-9]/gi, "_");
        const link = document.createElement("a");
        link.download = `student-qr-${safeEmail}.png`;
        link.href = out.toDataURL("image/png");
        link.click();
    }, [email, size, exportScale]);

    return (
        <div
            className={`inline-flex flex-col items-center gap-3 rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
        >
            <div
                ref={containerRef}
                className="rounded-sm border border-zinc-100 bg-white p-2 dark:border-zinc-800"
            >
                {email ? (
                    <QRCodeCanvas
                        value={targetUrl}
                        // Render canvas internal resolution at double/triple density
                        size={size * displayScale}
                        // Scale canvas down visually using CSS so it occupies the requested `size`
                        style={{ width: size, height: size }}
                        level="H"
                        bgColor="#ffffff"
                        fgColor="#0B1E3D"
                        marginSize={1}
                        imageSettings={{
                            src: LOGO_SRC,
                            height: size * displayScale * 0.22,
                            width: size * displayScale * 0.22,
                            excavate: true,
                        }}
                    />
                ) : (
                    <div
                        style={{ width: size, height: size }}
                        className="flex items-center justify-center text-center text-xs text-zinc-400"
                    >
                        No email
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={handleDownload}
                disabled={!email}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm bg-[#0B1E3D] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#10294d] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
            >
                <Download size={12} />
               Download
            </button>
        </div>
    );
}