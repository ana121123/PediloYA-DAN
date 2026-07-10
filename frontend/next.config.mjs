/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  
  async rewrites() {
    // Si existe la variable de entorno, la usa. Si no, usa localhost (127.0.0.1)
    const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://127.0.0.1:8090';
    return [
      {
        // 1. Todo lo que sea de USUARIOS -> Al Gateway (8090)
        source: '/usuariosMs/:path*',
        destination: `${GATEWAY_URL}/usuariosMs/:path*`,
      },
      {
        // 2. Todo lo que sea de CATÁLOGO -> Al Gateway (8090)
        source: '/catalogoMs/:path*',
        destination: `${GATEWAY_URL}/catalogoMs/:path*`,
      },
      {
        // 3. Todo lo que sea de PEDIDO -> Al Gateway (8090)
        source: '/pedidoMs/:path*',
        destination: `${GATEWAY_URL}/pedidoMs/:path*`,
      },
      {
        // 4. Todo lo que sea de PAGO -> Al Gateway (8090)
        source: '/pagoMs/:path*',
        destination: `${GATEWAY_URL}/pagoMs/:path*`,
      },
      {
        // 5. Todo lo que sea de IA -> Al Gateway (8090)
        source: '/iaMs/:path*',
        destination: `${GATEWAY_URL}/iaMs/:path*`,
      },
    ]
  },
}

export default nextConfig