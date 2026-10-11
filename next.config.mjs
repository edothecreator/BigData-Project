/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The MongoDB driver is a server-only dependency; keep it external to the
  // server bundle so Next does not attempt to bundle its optional native deps.
  serverExternalPackages: ["mongodb"],
};

export default nextConfig;
