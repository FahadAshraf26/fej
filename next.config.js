/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: false,
  // Increase body size limit for large PSD files
  experimental: {
    serverComponentsExternalPackages: ["@imgly/psd-importer"],
  },
  // Configure API routes to handle larger payloads
  api: {
    bodyParser: {
      sizeLimit: "900mb", // 900MB limit for very large PSD files
    },
  },
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/templates",
        permanent: true,
      },
    ];
  },
  images: {
    domains: [
      "oobtxuazqbzntvhmvjtj.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, ""),
    ],
  },
  env: {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    PRODUCT_PRICE_ID: process.env.PRODUCT_PRICE_ID,
    REACT_APP_LICENSE: process.env.REACT_APP_LICENSE,
    TWILLO_PHONE: process.env.TWILLO_PHONE,
    SENTRY_DSN_KEY: process.env.SENTRY_DSN_KEY,
    SITE_DOMAIN: process.env.SITE_DOMAIN,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  },
  compiler: {
    removeConsole: false,
  },
  serverRuntimeConfig: {
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  },
};

module.exports = nextConfig;
