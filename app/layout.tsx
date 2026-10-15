import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Nunito,
  Poppins,
  Rubik_Spray_Paint,
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const rubikSprayPaint = Rubik_Spray_Paint({
  subsets: ["latin"],
  variable: "--font-rubik-spray",
  display: "swap",
  weight: "400",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://staff.austratraininginstitute.co.ke";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Staff Portal | Austra Training Institute",
    template: "%s | Austra Staff Portal",
  },

  description:
    "Internal administration and management staff portal for Austra Training Institute, Eldoret, Kenya.",

  applicationName: "Austra Staff Portal",

  authors: [
    {
      name: "Austra Training Institute",
      url: siteUrl,
    },
  ],

  creator: "Austra Training Institute",
  publisher: "Austra Training Institute",

  // Prevent search engines from indexing sensitive/internal staff portal routes
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_KE",
    url: siteUrl,
    siteName: "Austra Staff Portal",
    title: "Austra Staff Portal | Austra Training Institute",
    description: "Internal staff portal for Austra Training Institute.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Austra Staff Portal",
      },
    ],
  },

  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "any",
      },
      {
        url: "/icon.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: [
      {
        url: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },

  manifest: "/manifest.webmanifest",

  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": `${siteUrl}/#organization`,
      name: "Austra Training Institute",
      alternateName: "Austra Training Institute Eldoret",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon.png`,
      },
      description:
        "A professional training institution in Eldoret, Kenya offering TVET, professional, technical and career-focused training.",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-KE"
      className={`
        ${poppins.variable}
        ${nunito.variable}
        ${rubikSprayPaint.variable}
        ${geistSans.variable}
        ${geistMono.variable}
        font-sans
        h-full
        antialiased
        bg-zinc-50
      `}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
      </head>

      <body className={`${nunito.className} min-h-full flex flex-col antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
