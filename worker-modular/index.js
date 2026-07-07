import { jsonResponse, corsHeaders } from "./utils/response.js";
import { handleAccidents } from "./routes/accidents.js";
import { handleAiAssistant } from "./routes/aiAssistant.js";

export const VERSION = "6.3.0";
export const BRAND = {
  name: "GUI's Arc",
  title: "Construction Field Guide",
  subtitle: "Weather · Safety · Field AI Assistant",
  version: `v${VERSION}`
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request) });
    const url = new URL(request.url);

    try {
      if (url.pathname === "/accidents") return await handleAccidents(request, env, BRAND);
      if (url.pathname === "/ai-assistant") return await handleAiAssistant(request, env, BRAND);
      if (url.pathname === "/health") return jsonResponse(request, { ok: true, brand: BRAND, time: new Date().toISOString() });

      return jsonResponse(request, {
        ok: false,
        message: "모듈형 Worker 샘플입니다. forecast/geocode/reverse 운영은 worker/worker.js 번들본을 사용하세요.",
        available: ["/accidents", "/ai-assistant", "/health"],
        brand: BRAND
      }, 404);
    } catch (error) {
      return jsonResponse(request, { ok: false, message: error.message, brand: BRAND }, 500);
    }
  }
};
