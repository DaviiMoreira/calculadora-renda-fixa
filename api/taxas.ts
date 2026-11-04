import type { VercelRequest, VercelResponse } from "@vercel/node";

// Séries do SGS (Banco Central): 432 Selic meta, 4389 CDI anualizado base 252, 13522 IPCA 12 meses
const SERIES = { selic: 432, cdi: 4389, ipca: 13522 } as const;

async function ultimoValor(codigo: number): Promise<{ valor: number; data: string }> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/1?formato=json`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) throw new Error(`BCB respondeu ${resp.status} para a série ${codigo}`);
  const dados = (await resp.json()) as Array<{ data: string; valor: string }>;
  const item = dados[0];
  const valor = Number(item?.valor);
  if (!item || !Number.isFinite(valor)) throw new Error(`Série ${codigo} sem valor válido`);
  return { valor, data: item.data };
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const [selic, cdi, ipca] = await Promise.all([
      ultimoValor(SERIES.selic),
      ultimoValor(SERIES.cdi),
      ultimoValor(SERIES.ipca),
    ]);
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({ selic, cdi, ipca, fonte: "Banco Central do Brasil (SGS)" });
  } catch (err) {
    res.status(502).json({ erro: err instanceof Error ? err.message : "Falha ao consultar o Banco Central" });
  }
}
