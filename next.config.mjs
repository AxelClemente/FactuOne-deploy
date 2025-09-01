/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['pg', 'pg-native'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Excluir PostgreSQL del bundle del cliente
      config.resolve.alias = {
        ...config.resolve.alias,
        'pg': false,
        'pg-native': false,
        'pg-hstore': false,
        'pg-cloudflare': false,
      };
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        tls: false,
        assert: false,
        path: false,
        url: false,
        util: false,
      };
    }
    return config;
  },
}

export default nextConfig
