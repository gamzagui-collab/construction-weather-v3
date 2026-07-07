import { jsonResponse } from "../utils/response.js";

// 운영용 /accidents는 worker/worker.js 번들본에 포함되어 있습니다.
// wrangler 모듈형 전환 시에는 worker/worker.js의 handleAccidents 관련 함수 블록을 이 파일로 이동하세요.
export async function handleAccidents(request, env, BRAND) {
  return jsonResponse(request, {
    ok: false,
    message: "모듈형 accidents는 분리 준비 파일입니다. 현재 운영은 worker/worker.js 번들본의 /accidents를 사용하세요.",
    brand: BRAND
  }, 501);
}
