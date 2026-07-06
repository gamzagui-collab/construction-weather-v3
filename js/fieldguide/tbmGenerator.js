export function buildTbmText(summary, trades){ return `오늘 TBM 전달사항\n\n${summary.heatText}\n${summary.rainText}\n\n선택 공종: ${trades.join(", ")||"없음"}\n\n${summary.advice.join("\n")}`; }
