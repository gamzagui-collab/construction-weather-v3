import { jsonResponse, corsHeaders } from "./utils/response.js";
import { handleKoshaStatus, handleKoshaDebug } from "./routes/kosha.js";
import { handleEnterpriseAi } from "./routes/enterpriseAi.js";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request) });
    const url = new URL(request.url);
    try {
      if (url.pathname === "/kosha/status") return await handleKoshaStatus(request, env);
      if (url.pathname === "/debug/kosha") return await handleKoshaDebug(request, env);
      if (url.pathname === "/enterprise-ai") return await handleEnterpriseAi(request, env);
      return jsonResponse(request, { ok: false, message: "Enterprise route not found" }, 404);
    } catch (error) {
      return jsonResponse(request, { ok: false, message: error.message }, 500);
    }
  }
};
