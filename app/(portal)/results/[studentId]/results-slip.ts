import type { CourseAggregate } from "../utils";

/* -------------------------------------------------------------------------- */
/* Grading scale                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The institution's 7-band grading scale. Mirrors `marksToGrade` in
 * `app/types/results.ts` — keep the two in sync if the scale changes.
 *
 * Lives here (rather than the page) so the PDF generator and the on-screen
 * grading-scale card share a single source of truth.
 */
export const GRADING_SCALE = [
    { range: "80 – 100", label: "Grade 1 (Distinction)" },
    { range: "75 – 79", label: "Grade 2 (Distinction)" },
    { range: "70 – 74", label: "Grade 3 (Credit)" },
    { range: "60 – 69", label: "Grade 4 (Credit)" },
    { range: "50 – 59", label: "Grade 5 (Pass)" },
    { range: "40 – 49", label: "Grade 6 (Pass)" },
    { range: "0 – 39", label: "Grade 7 (Fail)" },
] as const;

/* -------------------------------------------------------------------------- */
/* Palette                                                                    */
/* -------------------------------------------------------------------------- */

type RGB = [number, number, number];

const NAVY: RGB = [8, 43, 102]; // #082B66
const ORANGE: RGB = [251, 146, 60]; // orange-400
const INK: RGB = [32, 32, 32];
const MUTED: RGB = [102, 102, 102];
const FAINT: RGB = [160, 160, 160];
const BORDER: RGB = [229, 229, 229]; // card stroke
const MICA: RGB = [243, 243, 243]; // header / info fills
const SURFACE: RGB = [250, 250, 250]; // card fill
const WHITE: RGB = [255, 255, 255];
const NAVY_SOFT: RGB = [186, 200, 226]; // caption on navy

const R = 0.9; // corner radius (mm) — reads as rounded-sm at print size

/** Text colour for a grade label, so results read at a glance. */
function gradeColor(grade: string): RGB {
    if (grade.includes("Distinction")) return [4, 120, 87];
    if (grade.includes("Credit")) return [3, 105, 161];
    if (grade.includes("Pass")) return [180, 83, 9];
    if (grade === "Incomplete") return MUTED;
    return [185, 28, 28];
}

/** Soft background for grade chips. */
function gradeTint(grade: string): RGB {
    if (grade.includes("Distinction")) return [229, 247, 239];
    if (grade.includes("Credit")) return [231, 242, 252];
    if (grade.includes("Pass")) return [254, 243, 224];
    if (grade === "Incomplete") return MICA;
    return [254, 232, 232];
}

/** Short, deterministic-looking reference code for the slip. */
function buildReference(seed: string): string {
    let h = 5381;
    for (let i = 0; i < seed.length; i++) {
        h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
    }
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return `RS-${stamp}-${h.toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;
}

/* -------------------------------------------------------------------------- */
/* Fonts (Google Fonts, self-hosted as static TTFs in /public/fonts)          */
/* -------------------------------------------------------------------------- */

type FontKey = "body" | "strong" | "head" | "display";
type FontSpec = { family: string; style: "normal" | "bold" };

const FONT_FILES: {
    key: FontKey;
    url: string;
    file: string;
    family: string;
}[] = [
        {
            key: "body",
            url: "/fonts/Inter-Regular.ttf",
            file: "Inter-Regular.ttf",
            family: "Inter",
        },
        {
            key: "strong",
            url: "/fonts/Inter-SemiBold.ttf",
            file: "Inter-SemiBold.ttf",
            family: "InterSemiBold",
        },
        {
            key: "head",
            url: "/fonts/PlusJakartaSans-Bold.ttf",
            file: "PlusJakartaSans-Bold.ttf",
            family: "JakartaBold",
        },
        {
            key: "display",
            url: "/fonts/PlusJakartaSans-ExtraBold.ttf",
            file: "PlusJakartaSans-ExtraBold.ttf",
            family: "JakartaExtraBold",
        },
    ];

/** Used for any font that fails to load, so the slip always generates. */
const FALLBACK: Record<FontKey, FontSpec> = {
    body: { family: "helvetica", style: "normal" },
    strong: { family: "helvetica", style: "bold" },
    head: { family: "helvetica", style: "bold" },
    display: { family: "helvetica", style: "bold" },
};

/* -------------------------------------------------------------------------- */
/* Asset helpers                                                              */
/* -------------------------------------------------------------------------- */

/** Fetch an image from /public and return it as a base64 data URL. */
async function loadImageAsDataUrl(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to load image: ${url} (${res.status})`);
    }
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

/** Fetch a font file and return it as base64 (the form jsPDF's VFS expects). */
async function loadFontAsBase64(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to load font: ${url} (${res.status})`);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
}

/** Read the intrinsic pixel dimensions so we can preserve aspect ratio. */
async function getImageDimensions(
    dataUrl: string,
): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () =>
            resolve({
                width: img.naturalWidth,
                height: img.naturalHeight,
            });
        img.onerror = () => reject(new Error("Failed to decode image"));
        img.src = dataUrl;
    });
}

/* -------------------------------------------------------------------------- */
/* Results slip generator                                                     */
/* -------------------------------------------------------------------------- */
export async function generateResultsSlip({
    studentName,
    admissionNumber,
    courseCode,
    courseName,
    aggregate,
    totalUnits,
    qrDataUrl,                       // NEW
}: {
    studentName: string;
    admissionNumber?: string;
    courseCode: string;
    courseName: string;
    aggregate: CourseAggregate;
    totalUnits?: number;
    qrDataUrl?: string;              // NEW: PNG data URL from <QRCodeCanvas>
}): Promise<void> {
    /* ---------- Load assets, fonts + PDF libs in parallel ---------- */
    const [letterheadDataUrl, signatureDataUrl, fontData, pdfImports] =
        await Promise.all([
            // Missing assets degrade gracefully — the slip still generates.
            loadImageAsDataUrl("/australetterhead.png").catch(() => null),
            loadImageAsDataUrl("/director_sign.png").catch(() => null),
            Promise.all(
                FONT_FILES.map((f) =>
                    loadFontAsBase64(f.url).catch(() => null),
                ),
            ),
            Promise.all([import("jspdf"), import("jspdf-autotable")]),
        ]);

    const [{ jsPDF }, { default: autoTable }] = pdfImports;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = 14; // page margin
    const CW = pageW - M * 2; // content width
    const TOP = 8; // first content line (below the top accent bar)
    const BOTTOM = 16; // space reserved for the footer

    /* ---------- Register fonts ---------- */
    const F: Record<FontKey, FontSpec> = { ...FALLBACK };
    FONT_FILES.forEach((f, i) => {
        const b64 = fontData[i];
        if (!b64) return;
        try {
            doc.addFileToVFS(f.file, b64);
            doc.addFont(f.file, f.family, "normal");
            F[f.key] = { family: f.family, style: "normal" };
        } catch {
            /* keep fallback */
        }
    });

    const font = (k: FontKey) => doc.setFont(F[k].family, F[k].style);

    const reference = buildReference(
        `${studentName}|${admissionNumber ?? ""}|${courseCode}|${Date.now()}`,
    );
    const issued = new Date();
    const issuedDate = issued.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

    let y = TOP;

    /* ---------- Small drawing helpers ---------- */
    const ensureSpace = (h: number) => {
        if (y + h > pageH - BOTTOM) {
            doc.addPage();
            y = TOP + 2;
        }
    };

    /** Rounded card with a hairline border. */
    const card = (
        x: number,
        yy: number,
        w: number,
        h: number,
        fill: RGB = SURFACE,
        stroke: RGB = BORDER,
    ) => {
        doc.setFillColor(...fill);
        doc.setDrawColor(...stroke);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, yy, w, h, R, R, "FD");
    };

    /** Windows 11-style selection pill (the little vertical accent). */
    const pill = (x: number, yy: number, h: number, color: RGB = ORANGE) => {
        doc.setFillColor(...color);
        doc.roundedRect(x, yy, 0.9, h, 0.45, 0.45, "F");
    };

    /** Small muted caption (sentence case, like Windows UI labels). */
    const caption = (
        text: string,
        x: number,
        yy: number,
        color: RGB = MUTED,
        size = 6.4,
        align: "left" | "right" | "center" = "left",
    ) => {
        font("body");
        doc.setFontSize(size);
        doc.setTextColor(...color);
        doc.text(text, x, yy, { align });
    };

    const sectionHeading = (text: string) => {
        pill(M, y - 3.1, 4);
        font("head");
        doc.setFontSize(8.5);
        doc.setTextColor(...NAVY);
        doc.text(text, M + 3, y);
        y += 4.6;
    };

    /* ---------- 1. Letterhead ---------- */
    y += 1;
    if (letterheadDataUrl) {
        const { width: iw, height: ih } =
            await getImageDimensions(letterheadDataUrl);
        const aspect = ih / iw;
        let lhW = CW;
        let lhH = lhW * aspect;
        const MAX_LH_HEIGHT = 22;
        if (lhH > MAX_LH_HEIGHT) {
            lhH = MAX_LH_HEIGHT;
            lhW = lhH / aspect;
        }
        const lhX = M + (CW - lhW) / 2;
        doc.addImage(letterheadDataUrl, "PNG", lhX, y, lhW, lhH);
        y += lhH + 4;
    } else {
        y += 2;
    }

    /* ---------- 2. Title row ---------- */
    pill(M, y + 1.2, 11);
    font("display");
    doc.setFontSize(17);
    doc.setTextColor(...NAVY);
    doc.text("Results Slip", M + 3.6, y + 6.4);
    caption("Official academic record", M + 3.6, y + 11.4, MUTED, 7.5);

    const metaRight = M + CW;
    caption("Reference", metaRight, y + 2.4, MUTED, 6.2, "right");
    font("strong");
    doc.setFontSize(8.2);
    doc.setTextColor(...NAVY);
    doc.text(reference, metaRight, y + 6.2, { align: "right" });

    caption("Date issued", metaRight, y + 10.2, MUTED, 6.2, "right");
    font("strong");
    doc.setFontSize(8.2);
    doc.setTextColor(...NAVY);
    doc.text(issuedDate, metaRight, y + 14, { align: "right" });

    y += 17.5;

    /* ---------- 3. Student / course card ---------- */

    // Reserve a column for the QR when we have one.
    const hasQr = Boolean(qrDataUrl);
    const qrColW = hasQr ? 30 : 0;
    const qrGap = hasQr ? 3 : 0;
    const cardW = CW - qrColW - qrGap;
    const qrBoxX = M + cardW + qrGap;

    // Column split within the (possibly narrower) card
    const colBX = M + cardW * 0.7;
    const colAX = M + 5;
    const colAW = colBX - colAX - 8;

    font("head");
    doc.setFontSize(11.5);
    const nameLines: string[] = doc.splitTextToSize(studentName, colAW);
    font("strong");
    doc.setFontSize(8.5);
    const courseLines: string[] = doc.splitTextToSize(courseName, colAW);

    const row1 = y + 5;
    const nameY = row1 + 5;
    const row2 = nameY + (nameLines.length - 1) * 4.7 + 6;
    const courseY = row2 + 4.6;
    const cardBottom = courseY + (courseLines.length - 1) * 3.7 + 3.6;

    // Content-driven height, but guarantee room for QR + caption.
    const contentH = cardBottom - y;
    const qrInner = 22;
    const qrGroupH = qrInner + 7;              // QR + caption gap
    const minCardHForQr = qrGroupH + 6;        // 3mm breathing room each side
    const cardH = hasQr
        ? Math.max(contentH, minCardHForQr)
        : contentH;

    card(M, y, cardW, cardH);
    pill(M + 2, y + 3.5, cardH - 7);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(colBX - 5, y + 4, colBX - 5, y + cardH - 4);

    caption("Student name", colAX, row1);
    font("head");
    doc.setFontSize(11.5);
    doc.setTextColor(...NAVY);
    doc.text(nameLines, colAX, nameY, { lineHeightFactor: 1.15 });

    caption("Course", colAX, row2);
    font("strong");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(courseLines, colAX, courseY, { lineHeightFactor: 1.2 });

    caption("Admission no.", colBX, row1);
    font("strong");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(admissionNumber || "—", colBX, nameY);

    caption("Course code", colBX, row2);
    font("strong");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(courseCode, colBX, courseY);

    // QR block (matches the palette + settings of <GenerateStudentQr />)
    if (hasQr && qrDataUrl) {
        card(qrBoxX, y, qrColW, cardH, WHITE);

        const qrDrawX = qrBoxX + (qrColW - qrInner) / 2;
        const qrDrawY = y + (cardH - qrGroupH) / 2;

        doc.addImage(qrDataUrl, "PNG", qrDrawX, qrDrawY, qrInner, qrInner);

        caption(
            "Scan to verify",
            qrBoxX + qrColW / 2,
            qrDrawY + qrInner + 3.5,
            MUTED,
            5.5,
            "center",
        );
    }

    y += cardH + 5;

    /* ---------- 4. Overall summary ---------- */
    const completeCount = aggregate.units.filter((u) => u.isComplete).length;
    const SUM_H = 16;
    ensureSpace(SUM_H + 30);

    const gapS = 3;
    const w1 = CW * 0.36;
    const w2 = (CW - w1 - gapS * 2) / 2;
    const x1 = M;
    const x2 = M + w1 + gapS;
    const x3 = x2 + w2 + gapS;

    // Overall score — solid navy
    card(x1, y, w1, SUM_H, NAVY, NAVY);
    pill(x1 + 3, y + 4, SUM_H - 8);
    caption("Overall score", x1 + 6.5, y + 5.4, NAVY_SOFT, 6.4);
    font("display");
    doc.setTextColor(...WHITE);
    if (aggregate.isComplete) {
        doc.setFontSize(16);
        doc.text(`${aggregate.totalScore.toFixed(1)}%`, x1 + 6.5, y + 12.6);
    } else {
        doc.setFontSize(11.5);
        doc.text("Incomplete", x1 + 6.5, y + 12.2);
    }

    // Overall grade
    const gradeAccent = aggregate.isComplete
        ? gradeColor(aggregate.grade)
        : MUTED;
    card(x2, y, w2, SUM_H);
    pill(x2 + 3, y + 4, SUM_H - 8, gradeAccent);
    caption("Overall grade", x2 + 6.5, y + 5.4);
    font("head");
    doc.setFontSize(9);
    doc.setTextColor(...(aggregate.isComplete ? gradeAccent : NAVY));
    const gradeLines: string[] = doc.splitTextToSize(
        aggregate.grade,
        w2 - 10,
    );
    doc.text(gradeLines, x2 + 6.5, y + 12, { lineHeightFactor: 1.1 });

    // Units complete
    card(x3, y, w2, SUM_H);
    pill(x3 + 3, y + 4, SUM_H - 8, NAVY);
    caption("Units complete", x3 + 6.5, y + 5.4);
    font("display");
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    const possibleUnits = totalUnits ?? aggregate.units.length;
    doc.text(`${completeCount} / ${possibleUnits}`, x3 + 6.5, y + 12.6);

    y += SUM_H + 3;

    if (!aggregate.isComplete) {
        caption(
            "Totals and grades are calculated only once every unit in the course is complete.",
            M,
            y + 1,
            MUTED,
            6.4,
        );
        y += 3.5;
    }
    y += 3.5;

    /* ---------- 5. Unit table ---------- */
    ensureSpace(30);
    sectionHeading("Unit performance");

    const tableStartY = y;
    const tableStartPage = doc.getCurrentPageInfo().pageNumber;

    autoTable(doc, {
        startY: y,
        head: [
            [
                "#",
                "Unit code",
                "Unit name",
                "CAT / Prac (/30)",
                "Final exam (/70)",
                "Total (/100)",
                "Grade",
            ],
        ],
        body: aggregate.units.map((u, i) => [
            String(i + 1),
            u.unitCode,
            u.unitName,
            u.isComplete ? u.catPracticalScore.toFixed(1) : "—",
            u.isComplete ? u.finalExamScore.toFixed(1) : "—",
            u.isComplete ? u.total.toFixed(1) : "—",
            u.grade,
        ]),
        theme: "plain",
        styles: {
            font: F.body.family,
            fontStyle: F.body.style,
            fontSize: 7.5,
            textColor: INK,
            cellPadding: { top: 2.1, bottom: 2.1, left: 2.5, right: 2.5 },
            lineWidth: 0,
            valign: "middle",
        },
        headStyles: {
            font: F.strong.family,
            fontStyle: F.strong.style,
            fillColor: MICA,
            textColor: MUTED,
            fontSize: 6.6,
            valign: "middle",
            cellPadding: { top: 2.4, bottom: 2.4, left: 2.5, right: 2.5 },
        },
        columnStyles: {
            0: { cellWidth: 8, halign: "center", textColor: MUTED },
            1: { cellWidth: 22 },
            2: { cellWidth: "auto" },
            3: { cellWidth: 22, halign: "right" },
            4: { cellWidth: 22, halign: "right" },
            5: { cellWidth: 20, halign: "right" },
            6: { cellWidth: 38, halign: "left" },
        },
        margin: { left: M, right: M, top: TOP + 2, bottom: BOTTOM },
        didParseCell: (data) => {
            if (data.section === "head") {
                if ([3, 4, 5].includes(data.column.index)) {
                    data.cell.styles.halign = "right";
                } else if (data.column.index === 0) {
                    data.cell.styles.halign = "center";
                } else {
                    data.cell.styles.halign = "left";
                }
            }
            if (data.section === "body") {
                if (data.column.index === 1) {
                    data.cell.styles.font = F.strong.family;
                    data.cell.styles.fontStyle = F.strong.style;
                    data.cell.styles.textColor = NAVY;
                }
                if (data.column.index === 5) {
                    data.cell.styles.font = F.strong.family;
                    data.cell.styles.fontStyle = F.strong.style;
                    data.cell.styles.textColor = NAVY;
                }
                if (data.column.index === 6) {
                    // The chip is drawn in didDrawCell; hide the plain text
                    // by matching it to the chip colour so row height stays.
                    const g = String(data.cell.raw);
                    data.cell.styles.font = F.strong.family;
                    data.cell.styles.fontStyle = F.strong.style;
                    data.cell.styles.fontSize = 6.6;
                    data.cell.styles.textColor = gradeTint(g);
                }
            }
        },
        didDrawCell: (data) => {
            const { x, y: cy, width, height } = data.cell;
            doc.setDrawColor(...BORDER);
            doc.setLineWidth(0.2);
            doc.line(x, cy + height, x + width, cy + height);

            // Grade chip
            if (data.section === "body" && data.column.index === 6) {
                const g = String(data.cell.raw);
                font("strong");
                doc.setFontSize(6.6);
                const tw = doc.getTextWidth(g);
                const chipW = tw + 5;
                const chipH = 4.6;
                const chipX = x + 2.5;
                const chipY = cy + (height - chipH) / 2;
                doc.setFillColor(...gradeTint(g));
                doc.roundedRect(chipX, chipY, chipW, chipH, R, R, "F");
                doc.setTextColor(...gradeColor(g));
                doc.text(g, chipX + 2.5, cy + height / 2, {
                    baseline: "middle",
                });
            }
        },
    });

    const tableEnd = (
        doc as unknown as { lastAutoTable: { finalY: number } }
    ).lastAutoTable.finalY;

    // Outer rounded border — only when the table stayed on a single page.
    if (doc.getCurrentPageInfo().pageNumber === tableStartPage) {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.25);
        doc.roundedRect(M, tableStartY, CW, tableEnd - tableStartY, R, R, "S");
    }

    y = tableEnd + 6;

    /* ---------- 6. Grading scale ---------- */
    const CELL_H = 11.5;
    ensureSpace(5 + CELL_H + 8);
    sectionHeading("Grading scale");

    const gapG = 1.5;
    const cellW = (CW - gapG * (GRADING_SCALE.length - 1)) / GRADING_SCALE.length;
    GRADING_SCALE.forEach((g, i) => {
        const cx = M + i * (cellW + gapG);
        const match = g.label.match(/^(Grade \d)\s*\((.+)\)$/);
        const gradeNo = match ? match[1] : g.label;
        const band = match ? match[2] : "";

        card(cx, y, cellW, CELL_H, WHITE);

        font("head");
        doc.setFontSize(7);
        doc.setTextColor(...NAVY);
        doc.text(gradeNo, cx + cellW / 2 + 1, y + 3.6, { align: "right" });

        font("body");
        doc.setFontSize(6.6);
        doc.setTextColor(...INK);
        doc.text(`${g.range}%`, cx + cellW / 2, y + 7, { align: "right" });

        font("strong");
        doc.setFontSize(5.8);
        doc.setTextColor(...gradeColor(g.label));
        doc.text(band, cx + cellW / 2, y + 9.6, { align: "right" });
    });
    y += CELL_H + 6;

    /* ---------- 7. Authorisation (trainer, director, stamp) ---------- */
    const AUTH_H = 25;
    const NOTICE_H = 8;
    ensureSpace(5 + AUTH_H + NOTICE_H + 4);
    sectionHeading("Authorisation");
    y += 1;

    const gap = 8;
    const colW = (CW - gap * 2) / 3;
    const colX = (i: number) => M + i * (colW + gap);
    const lineY = y + 16.5;

    const slotCaption = (i: number, title: string, sub: string) => {
        const cx = colX(i) + colW / 2;
        font("strong");
        doc.setFontSize(7);
        doc.setTextColor(...NAVY);
        doc.text(title, cx, lineY + 3.8, { align: "center" });
        caption(sub, cx, lineY + 6.8, MUTED, 6.2, "center");
    };

    // Slot 1 — Trainer (left blank; signed by hand after printing)
    caption(
        "Sign here after printing",
        colX(0) + colW / 2,
        y + 9,
        FAINT,
        6.4,
        "center",
    );
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.25);
    doc.line(colX(0), lineY, colX(0) + colW, lineY);
    slotCaption(0, "Trainer's signature", "Name, signature & date");

    // Slot 2 — Director (pre-signed image if available)
    if (signatureDataUrl) {
        const { width: iw, height: ih } =
            await getImageDimensions(signatureDataUrl);
        let sigW = 34;
        let sigH = sigW * (ih / iw);
        const MAX_SIG_H = 14;
        if (sigH > MAX_SIG_H) {
            sigH = MAX_SIG_H;
            sigW = sigH * (iw / ih);
        }
        doc.addImage(
            signatureDataUrl,
            "PNG",
            colX(1) + (colW - sigW) / 2,
            lineY - sigH - 0.5,
            sigW,
            sigH,
        );
    }
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.25);
    doc.line(colX(1), lineY, colX(1) + colW, lineY);
    slotCaption(1, "Director", "Authorised signatory");

    // Slot 3 — Official stamp (dashed placeholder, stamped by hand)
    const stampCx = colX(2) + colW / 2;
    const stampCy = y + 8.2;
    doc.setDrawColor(...FAINT);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1.3, 1.3], 0);
    doc.circle(stampCx, stampCy, 7.6, "S");
    doc.setLineDashPattern([], 0);
    font("strong");
    doc.setFontSize(5.8);
    doc.setTextColor(...FAINT);
    doc.text("Affix stamp", stampCx, stampCy, {
        align: "center",
        baseline: "middle",
    });
    slotCaption(2, "Official stamp", "Affix after printing");

    y += AUTH_H + 2;

    /* ---------- 8. Notice (info bar) ---------- */
    card(M, y, CW, NOTICE_H, [239, 246, 255], [205, 224, 247]);
    doc.setFillColor(...NAVY);
    doc.circle(M + 5, y + NOTICE_H / 2, 1.9, "F");
    font("head");
    doc.setFontSize(6);
    doc.setTextColor(...WHITE);
    doc.text("i", M + 5, y + NOTICE_H / 2 + 0.1, {
        align: "center",
        baseline: "middle",
    });
    font("body");
    doc.setFontSize(7);
    doc.setTextColor(...INK);
    doc.text(
        "This is a system-generated results slip and is not valid without an official stamp.",
        M + 9.5,
        y + NOTICE_H / 2,
        { baseline: "middle" },
    );
    y += NOTICE_H;

    /* ---------- 9. Page furniture on every page ---------- */
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Top accent bar: navy with a short orange lead-in
        doc.setFillColor(...NAVY);
        doc.rect(0, 0, pageW, 1.8, "F");
        doc.setFillColor(...ORANGE);
        doc.rect(0, 0, 28, 1.8, "F");

        // Footer
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.line(M, pageH - 11.5, pageW - M, pageH - 11.5);

        caption(
            "System-generated document  ·  Not valid without an official stamp",
            M,
            pageH - 7.5,
            MUTED,
            6.2,
        );
        caption(
            `${reference}  ·  Page ${i} of ${totalPages}`,
            pageW - M,
            pageH - 7.5,
            MUTED,
            6.2,
            "right",
        );
    }

    /* ---------- 10. Save ---------- */
    const safeName = studentName.replace(/[^a-zA-Z0-9]+/g, "-");
    doc.save(`Results-Slip-${courseCode}-${safeName}.pdf`);
}