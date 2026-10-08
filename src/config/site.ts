import { WEBSITE_URL, LEGACY_STATIC_HOST } from "./urls"

const baseSiteConfig = {
    name: "X Cards",
    description:
        "Share X anywhere, any format. A Chrome extension for easy access to X posts in multiple formats.",
    url: WEBSITE_URL,
    keywords: [
        "X.com",
        "Twitter",
        "Chrome Extension",
        "Social Media",
        "Content Sharing",
        "Card Generator",
        "Export Tools",
        "JSON",
        "Markdown",
        "PNG",
        "JPEG",
        "SVG",
    ],
    authors: [
        {
            name: "hzeyuan",
            url: "https://github.com/hzeyuan",
        }
    ],
    creator: '@IndieDevr',
    themeColor: '#fff',
    icons: {
        icon: `${LEGACY_STATIC_HOST}/x-cards/favicon/favicon.ico`,
        android: `${LEGACY_STATIC_HOST}/x-cards/favicon/android-chrome-192x192.png`,
        shortcut: `${LEGACY_STATIC_HOST}/x-cards/favicon/favicon.ico`,
        apple: `${LEGACY_STATIC_HOST}/x-cards/favicon/apple-touch-icon.png`,
    },
    ogImage: `${LEGACY_STATIC_HOST}/x-cards/favicon/x-cards-og.png`,
    links: {
        github: "https://github.com/hzeyuan/x-cards",
    },
}

export const siteConfig = {
    ...baseSiteConfig,
    openGraph: {
        type: "website",
        locale: "en_US",
        url: baseSiteConfig.url,
        image: baseSiteConfig.ogImage,
        title: baseSiteConfig.name,
        description: baseSiteConfig.description,
        siteName: baseSiteConfig.name,
    },
    twitter: {
        card: "summary_large_image",
        title: baseSiteConfig.name,
        image: baseSiteConfig.ogImage,
        description: baseSiteConfig.description,
        images: [`${baseSiteConfig.url}/xcards/favicon/x-cards-og.png`],
        creator: baseSiteConfig.creator,
    },
}