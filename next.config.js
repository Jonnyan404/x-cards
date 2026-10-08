const bundleAnalyzer = require('@next/bundle-analyzer')
const withBundleAnalyzer = bundleAnalyzer({
    enabled: false,
    openAnalyzer: true,
})

/**
 * GitHub Pages 的项目页是子路径形式：https://<user>.github.io/<repo>/
 * 静态产物必须整体下移，否则 /_next/static/... 会 404。
 * 本地开发不设这个变量，basePath 为空，行为与以前完全一致。
 * CI 里由 tools/check-pages.mjs 断言它和 urls.ts 的 WEBSITE_URL 一致。
 */
const basePath = process.env.BASE_PATH || "";

module.exports = withBundleAnalyzer({
    basePath,
    // Pages 按「目录 + index.html」托管，带尾斜杠能一次命中、不走重定向。
    // 改这一条必须同步改 src/config/urls.ts 里各个 Url() 的尾斜杠。
    trailingSlash: true,
    swcMinify: true,
    crossOrigin: 'anonymous',
    reactStrictMode: false,
    // typescript: {
    //     ignoreBuildErrors: true,
    // },
    // webpack: (config) => {
    //     config.externals = [...config.externals, { canvas: 'canvas' }];
    //     return config;
    // },
    // experimental: {
    //     serverActions: {
    //         allowedOrigins: []
    //     },
    // },

    // async redirects() {
    //     return [
    //         {
    //             source: "/home",
    //             destination: "/",
    //             permanent: false,
    //         }]
    // }


    typescript: {
        ignoreBuildErrors: true,
    },
    output: 'export',
    // 禁用图像优化，因为它需要 Next.js 服务器
    images: {
        unoptimized: true,
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            // 在服务器端构建时忽略 API 路由
            config.externals = config.externals || [];
            config.externals.push((context, request, callback) => {
                if (request.startsWith('pages/api/') || request.startsWith('app/api/')) {
                    return callback(null, `commonjs ${request}`);
                }
                callback();
            });
        }
        return config;
    },

})

