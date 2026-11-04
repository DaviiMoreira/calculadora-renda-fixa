import { describe, it, expect } from "vitest";
import { aliquotaIR, calcular, fatorPeriodo, taxaPoupancaAnual } from "./calc";

const taxas = { selic: 13.75, cdi: 13.65, ipca: 4.5 };

describe("aliquotaIR", () => {
  it("segue a tabela regressiva nas fronteiras", () => {
    expect(aliquotaIR(30)).toBe(0.225);
    expect(aliquotaIR(180)).toBe(0.225);
    expect(aliquotaIR(181)).toBe(0.2);
    expect(aliquotaIR(360)).toBe(0.2);
    expect(aliquotaIR(361)).toBe(0.175);
    expect(aliquotaIR(720)).toBe(0.175);
    expect(aliquotaIR(721)).toBe(0.15);
  });
});

describe("fatorPeriodo", () => {
  it("365 dias devolve a própria taxa anual", () => {
    expect(fatorPeriodo(10, 365)).toBeCloseTo(1.1, 10);
  });
});

describe("taxaPoupancaAnual", () => {
  it("usa 0,5% a.m. com Selic acima de 8,5%", () => {
    expect(taxaPoupancaAnual(13.75)).toBeCloseTo(6.1678, 3);
  });
  it("usa 70% da Selic com Selic até 8,5%", () => {
    expect(taxaPoupancaAnual(8)).toBeCloseTo(5.6, 10);
  });
});

describe("calcular", () => {
  it("CDB 100% em 1 ano: bruto pela taxa CDI e IR de 17,5%", () => {
    const r = calcular({ valor: 1000, dias: 365, percentualCdiCdb: 100, percentualCdiLci: 90 }, taxas);
    const cdb = r.find((x) => x.nome.startsWith("CDB"))!;
    expect(cdb.bruto).toBeCloseTo(1136.5, 6);
    expect(cdb.imposto).toBeCloseTo(136.5 * 0.175, 6);
    expect(cdb.liquido).toBeCloseTo(1136.5 - 23.8875, 6);
  });

  it("LCI e poupança não pagam IR", () => {
    const r = calcular({ valor: 1000, dias: 400, percentualCdiCdb: 100, percentualCdiLci: 90 }, taxas);
    expect(r.find((x) => x.nome.startsWith("LCI"))!.imposto).toBe(0);
    expect(r.find((x) => x.nome === "Poupança")!.imposto).toBe(0);
  });

  it("Tesouro Selic sem custódia até R$ 10 mil e com custódia acima", () => {
    const pouco = calcular({ valor: 10000, dias: 365, percentualCdiCdb: 100, percentualCdiLci: 90 }, taxas);
    expect(pouco.find((x) => x.nome === "Tesouro Selic")!.custos).toBe(0);
    const muito = calcular({ valor: 20000, dias: 365, percentualCdiCdb: 100, percentualCdiLci: 90 }, taxas);
    expect(muito.find((x) => x.nome === "Tesouro Selic")!.custos).toBeCloseTo(20, 6);
  });

  it("ordena do maior para o menor valor líquido", () => {
    const r = calcular({ valor: 5000, dias: 730, percentualCdiCdb: 110, percentualCdiLci: 92 }, taxas);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].liquido).toBeGreaterThanOrEqual(r[i].liquido);
  });

  it("rejeita entradas inválidas", () => {
    expect(() => calcular({ valor: 0, dias: 100, percentualCdiCdb: 100, percentualCdiLci: 90 }, taxas)).toThrow();
    expect(() => calcular({ valor: 100, dias: 10, percentualCdiCdb: 100, percentualCdiLci: 90 }, taxas)).toThrow();
  });
});
