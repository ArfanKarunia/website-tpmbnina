/** @type {import('next').NextConfig} */
const nextConfig = {
  // Aktifkan ini untuk proteksi header keamanan HTTP
  async headers() {
    return [
      {
        // Terapkan aturan ini ke SEMUA rute
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload' // Paksa HTTPS selama 2 tahun
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY' // Mencegah website di-embed di iframe orang lain (Anti-Clickjacking)
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff' // Mencegah browser menebak-nebak tipe file (Anti-MIME Sniffing)
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin' // Privasi data referer
          },
          {
            key: 'Permissions-Policy',
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" // Matikan akses hardware yg tidak perlu
          }
        ]
      }
    ]
  },
  // // Opsional: Jika kamu pakai Next.js Image Optimization dengan Supabase Storage
  // images: {
  //   remotePatterns: [
  //     {
  //       protocol: 'https',
  //       hostname: '**.supabase.co', // Izinkan gambar dari Supabase
  //     },
  //   ],
  // },
};

module.exports = nextConfig;