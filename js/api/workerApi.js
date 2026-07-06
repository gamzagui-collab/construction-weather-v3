import { APP_CONFIG } from "../config.js";
export async function fetchForecast(location){
  const url = `${APP_CONFIG.workerBaseUrl}/forecast?lat=${encodeURIComponent(location.lat)}&lon=${encodeURIComponent(location.lon)}&name=${encodeURIComponent(location.name)}`;
  const res = await fetch(url,{cache:"no-store"});
  if(!res.ok) throw new Error(`Worker forecast 오류: ${res.status}`);
  return res.json();
}
