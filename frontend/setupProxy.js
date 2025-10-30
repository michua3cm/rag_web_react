// src/setupProxy.js
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
    app.use(
        [
            "/gemini_native_stream",
            "/gemini_stream",
            "/dms_stream",
            "/openrouter_stream",
            "/debug_stream"
        ],
        createProxyMiddleware({
            target: "http://127.0.0.1:8888", // 用 127.0.0.1 避開 IPv6 (::1) 解析
            changeOrigin: true,
            // 關鍵：不要自己攔截處理回應，讓串流直接透傳
            // selfHandleResponse: false,
            onProxyRes(proxyRes) {
                // 確保不要被緩衝/快取
                proxyRes.headers["Cache-Control"] = "no-cache";
                proxyRes.headers["X-Accel-Buffering"] = "no"; // 若之後前面接 Nginx 也有用
                // 保險：避免中途壓縮破壞 SSE
                delete proxyRes.headers["content-encoding"];
            }
        })
    );
};
