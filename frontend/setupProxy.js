// src/setupProxy.js
const { createProxyMiddleware } = require("http-proxy-middleware");

const TARGET_URL = process.env.REACT_APP_API_BASE?.replace(/\/$/, ""); // remove trailing slash

module.exports = function (app) {
    app.use(
        [
            "/gemini_native_stream",
            "/gemini_stream",
            "/openrouter_stream",
            "/dms_stream"
        ],
        createProxyMiddleware({
            target: TARGET_URL,
            changeOrigin: true,
            ws: true,
            // VERY IMPORTANT for SSE
            onProxyReq: (proxyReq) => {
                proxyReq.setHeader("Accept", "text/event-stream");
                proxyReq.setHeader("Cache-Control", "no-cache");
                proxyReq.setHeader("Connection", "keep-alive");
            },
            onProxyRes: (proxyRes) => {
                proxyRes.headers["Cache-Control"] = "no-cache, no-transform";
                proxyRes.headers["X-Accel-Buffering"] = "no";
                // do NOT set content-encoding; compression breaks SSE chunking
                delete proxyRes.headers["content-encoding"];
            }
        })
    );
};
