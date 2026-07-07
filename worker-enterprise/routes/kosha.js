import { jsonResponse } from "../utils/response.js";

export async function handleKoshaStatus(request, env) {
  const started = Date.now();
  const hasKey = Boolean(env.KOSHA_API_KEY || env.KMA_API_KEY);
  return jsonResponse(request, {
    ok: true,
    service: "KOSHA Connector",
    hasKey,
    status: hasKey ? "ready" : "missing-key",
    ms: Date.now() - started,
    note: "실제 사고 조회는 운영용 worker/worker.js의 /accidents route를 사용합니다."
  });
}

export async function handleKoshaDebug(request, env) {
  return jsonResponse(request, {
    ok: true,
    message: "KOSHA debug endpoint foundation",
    checks: [
      "ServiceKey 존재 여부",
      "callApiId 고정값",
      "http/https endpoint",
      "JSON/XML parser",
      "fallback seed"
    ],
    next: "v6.4에서 GUI 디버그 패널과 연결"
  });
}
