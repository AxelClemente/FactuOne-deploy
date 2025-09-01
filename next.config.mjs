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
  serverExternalPackages: ['pg', 'pg-native', 'pg-cloudflare'],
  webpack: (config, { isServer }) => {
    // Configuración para excluir módulos del bundle del cliente
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'pg': 'commonjs pg',
        'pg-native': 'commonjs pg-native',
        'pg-cloudflare': 'commonjs pg-cloudflare',
        'cloudflare:sockets': 'commonjs cloudflare:sockets',
      });
      
      config.resolve.alias = {
        ...config.resolve.alias,
        'pg$': false,
        'pg-native$': false,
        'pg-hstore$': false,
        'pg-cloudflare$': false,
        'cloudflare:sockets$': false,
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
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
      };
    }
    
    // Marcar pg como external para el servidor también
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('pg-native');
    }
    
    return config;
  },
}

export default nextConfig
