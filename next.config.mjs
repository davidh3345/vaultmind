/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The 0G Storage SDK is an OPTIONAL runtime dependency: install it to enable real
  // 0G Storage. Keep it external so the build succeeds without it (the route falls
  // back to a local dev store, and surfaces an error if a key is set but the SDK is missing).
  experimental: {
    serverComponentsExternalPackages: ["@0gfoundation/0g-storage-ts-sdk"],
  },
  webpack: (config, { isServer }) => {
    // pdfjs-dist references `canvas` for Node; we only use it in the browser.
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "@0gfoundation/0g-storage-ts-sdk": "commonjs @0gfoundation/0g-storage-ts-sdk",
      });
    }
    return config;
  },
};

export default nextConfig;
