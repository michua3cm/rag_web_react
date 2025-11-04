// src/setupProxy.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const { createProxyMiddleware } = require("http-proxy-middleware");

const API_IP = process.env.REACT_APP_API_IP || "127.0.0.1";
const API_PORT = process.env.PORT || "8000";
const TARGET_URL = `http://${API_IP}:${API_PORT}`;

module.exports = function (app) {
    // ① 這組：SSE 路徑（後端沒有 /api 前綴）→ 去掉 /api 再轉
    app.use(
        [
            "/api/gemini_native_stream",
            "/api/gemini_stream",
            "/api/openrouter_stream",
            "/api/dms_stream"
        ],
        createProxyMiddleware({
            target: TARGET_URL,
            changeOrigin: true,
            ws: true,
            pathRewrite: { "^/api": "" }, // /api/gemini_* -> /gemini_*
            proxyTimeout: 0,
            timeout: 0,
            onProxyReq(req) {
                req.setHeader("Cache-Control", "no-cache");
                req.setHeader("Connection", "keep-alive");
            },
            onProxyRes(res) {
                res.headers["Cache-Control"] = "no-cache, no-transform";
                res.headers["X-Accel-Buffering"] = "no";
                delete res.headers["content-encoding"];
            }
            // logLevel: "debug",
        })
    );

    // ② 這組：其餘 /api/*（後端本來就有 /api 前綴）→ 原封不動轉
    app.use(
        "/api",
        createProxyMiddleware({
            target: TARGET_URL,
            changeOrigin: true,
            ws: true,
            proxyTimeout: 0,
            timeout: 0
            // logLevel: "debug",
        })
    );
};
