/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output is only needed for the Docker image (it emits a
  // self-contained .next/standalone/server.js). Enabling it unconditionally
  // breaks the normal `next start` flow locally, so we gate it behind an env
  // flag that the Dockerfile sets. Local `npm run build && npm run start`
  // then behaves normally.
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" } : {}),
  // The MongoDB driver is a server-only dependency; keep it external to the
  // server bundle so Next does not attempt to bundle its optional native deps.
  serverExternalPackages: ["mongodb"],
};

export default nextConfig;
