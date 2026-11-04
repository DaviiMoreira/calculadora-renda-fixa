export interface Taxas {
  selic: number; // % a.a.
  cdi: number; // % a.a.
  ipca: number; // % acumulado 12 meses
}

export interface Entrada {
  valor: number;
  dias: number;
  percentualCdiCdb: number; // ex: 100 = 100% do CDI
  percentualCdiLci: number;
}

export interface Resultado {
  nome: string;
  bruto: number;
  imposto: number;
  custos: number;
  liquido: number;
  rendimentoLiquido: number;
  rentabilidadeRealPct: number; // acima da inflação no período
  observacao: string;
}

/** Alíquota regressiva de IR sobre renda fixa (Lei 11.033/2004). */
export function aliquotaIR(dias: number): number {
  if (dias <= 180) return 0.225;
  if (dias <= 360) return 0.2;
  if (dias <= 720) return 0.175;
  return 0.15;
}

/** Converte taxa anual (%) para o fator do período em dias corridos. */
export function fatorPeriodo(taxaAnualPct: number, dias: number): number {
  return Math.pow(1 + taxaAnualPct / 100, dias / 365);
}

/** Poupança: 0,5% a.m. se Selic > 8,5%; senão 70% da Selic. TR desconsiderada. */
export function taxaPoupancaAnual(selic: number): number {
  if (selic > 8.5) return (Math.pow(1.005, 12) - 1) * 100;
  return selic * 0.7;
}

const TAXA_CUSTODIA_B3 = 0.002; // 0,20% a.a.
const ISENCAO_CUSTODIA_TESOURO_SELIC = 10000;

export function calcular(e: Entrada, t: Taxas): Resultado[] {
  if (!(e.valor > 0)) throw new Error("Valor deve ser maior que zero");
  if (!(e.dias >= 30)) throw new Error("Prazo mínimo de 30 dias");

  const ir = aliquotaIR(e.dias);
  const fatorInflacao = fatorPeriodo(t.ipca, e.dias);
  const montar = (
    nome: string,
    bruto: number,
    imposto: number,
    custos: number,
    observacao: string,
  ): Resultado => {
    const liquido = bruto - imposto - custos;
    return {
      nome,
      bruto,
      imposto,
      custos,
      liquido,
      rendimentoLiquido: liquido - e.valor,
      rentabilidadeRealPct: (liquido / e.valor / fatorInflacao - 1) * 100,
      observacao,
    };
  };

  const brutoCdb = e.valor * fatorPeriodo((t.cdi * e.percentualCdiCdb) / 100, e.dias);
  const cdb = montar(
    `CDB ${e.percentualCdiCdb}% do CDI`,
    brutoCdb,
    (brutoCdb - e.valor) * ir,
    0,
    `IR de ${(ir * 100).toFixed(1).replace(".", ",")}% sobre o rendimento`,
  );

  const brutoLci = e.valor * fatorPeriodo((t.cdi * e.percentualCdiLci) / 100, e.dias);
  const lci = montar(`LCI/LCA ${e.percentualCdiLci}% do CDI`, brutoLci, 0, 0, "Isenta de IR para pessoa física");

  const brutoTesouro = e.valor * fatorPeriodo(t.selic, e.dias);
  const baseCustodia = Math.max(0, e.valor - ISENCAO_CUSTODIA_TESOURO_SELIC);
  const custodia = baseCustodia * (Math.pow(1 + TAXA_CUSTODIA_B3, e.dias / 365) - 1);
  const tesouro = montar(
    "Tesouro Selic",
    brutoTesouro,
    (brutoTesouro - e.valor) * ir,
    custodia,
    "IR regressivo e custódia B3 de 0,20% a.a. sobre o que passar de R$ 10 mil",
  );

  const brutoPoup = e.valor * fatorPeriodo(taxaPoupancaAnual(t.selic), e.dias);
  const poupanca = montar("Poupança", brutoPoup, 0, 0, "Isenta de IR; TR não considerada");

  return [cdb, lci, tesouro, poupanca].sort((a, b) => b.liquido - a.liquido);
}
