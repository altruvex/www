import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("@ducanh2912/next-pwa").default({
    dest: "public",
    disable: process.env.NODE_ENV === "development",
    register: true,
    skipWaiting: true,
    runtimeCaching: [
        {
            urlPattern: /\/_next\/static\/.*/i,
            handler: "CacheFirst",
            options: {
                cacheName: "static-assets",
                expiration: {
                    maxEntries: 64,
                    maxAgeSeconds: 30 * 24 * 60 * 60,
                },
            },
        },
        {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|ico|webp|avif)$/i,
            handler: "CacheFirst",
            options: {
                cacheName: "image-cache",
                expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 30 * 24 * 60 * 60,
                },
            },
        },
        {
            urlPattern: /\.(woff|woff2|ttf|otf|eot)$/i,
            handler: "CacheFirst",
            options: {
                cacheName: "font-cache",
                expiration: {
                    maxEntries: 20,
                    maxAgeSeconds: 365 * 24 * 60 * 60,
                },
            },
        },
        {
            urlPattern: /^https:\/\/.*/i,
            handler: "NetworkFirst",
            options: {
                cacheName: "offlineCache",
                expiration: {
                    maxEntries: 200,
                    maxAgeSeconds: 24 * 60 * 60,
                },
                networkTimeoutSeconds: 10,
            },
        },
    ],
});

const nextConfig: NextConfig = {
    pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
    reactStrictMode: true,
    transpilePackages: ["@repo/database"],
    compress: true,
    poweredByHeader: false,
    // Image optimization for better Core Web Vitals
    images: {
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
        minimumCacheTTL: 60,
    },
    experimental: {
        optimizePackageImports: ["lucide-react"],
    },
    allowedDevOrigins: ['192.168.1.15'],
    async headers() {
        const isDev = process.env.NODE_ENV === "development";
        const scriptSrc = isDev
            ? "'self' 'unsafe-inline' 'unsafe-eval' https://www.clarity.ms https://www.googletagmanager.com https://va.vercel-scripts.com"
            : "'self' 'unsafe-inline' https://www.clarity.ms https://www.googletagmanager.com https://va.vercel-scripts.com";

        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: `default-src 'self'; script-src ${scriptSrc}; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://www.clarity.ms https://www.google-analytics.com https://analytics.google.com https://vitals.vercel-insights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`,
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains; preload',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()',
                    },
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                ],
            },
        ];
    },
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withMDX = require('@next/mdx')({
    extension: /\.mdx?$/,
    options: {
        remarkPlugins: [],
        rehypePlugins: [],
    },
});

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(withPWA(withMDX(nextConfig)));