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
  webpack: (config, { isServer, webpack }) => {
    // 1. Ignorar completamente el módulo cloudflare:sockets
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^cloudflare:sockets$/,
      })
    );
    
    // 2. Configuración específica para el cliente (browser)
    if (!isServer) {
      // Excluir completamente todos los módulos de PostgreSQL del bundle del cliente
      config.externals = config.externals || [];
      config.externals = [
        ...config.externals,
        {
          'pg': 'commonjs pg',
          'pg-native': 'commonjs pg-native', 
          'pg-cloudflare': 'commonjs pg-cloudflare',
        }
      ];
      
      // Resolver aliases para evitar que webpack trate de resolver estos módulos
      config.resolve.alias = {
        ...config.resolve.alias,
        'pg': false,
        'pg-native': false,
        'pg-hstore': false,
        'pg-cloudflare': false,
      };
      
      // Fallbacks para módulos de Node.js no disponibles en el browser
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
        events: false,
        buffer: false,
      };
    }
    
    // 3. Configuración para el servidor
    if (isServer) {
      // Mantener pg-native como external ya que es opcional
      config.externals = config.externals || [];
      config.externals.push('pg-native');
    }
    
    return config;
  },
}

export default nextConfig
