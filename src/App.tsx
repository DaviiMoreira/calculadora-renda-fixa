import { useEffect, useMemo, useState } from "react";
import { calcular, type Taxas } from "./calc";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n: number) => `${n.toFixed(2).replace(".", ",")}%`;

type Status = "carregando" | "ok" | "manual";

export default function App() {
  const [taxas, setTaxas] = useState<Taxas>({ selic: 13.75, cdi: 13.65, ipca: 4.5 });
  const [dataRef, setDataRef] = useState("");
  const [status, setStatus] = useState<Status>("carregando");
  const [valor, setValor] = useState(1000);
  const [dias, setDias] = useState(365);
  const [cdb, setCdb] = useState(100);
  const [lci, setLci] = useState(90);

  useEffect(() => {
    fetch("/api/taxas")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        setTaxas({ selic: d.selic.valor, cdi: d.cdi.valor, ipca: d.ipca.valor });
        setDataRef(d.selic.data);
        setStatus("ok");
      })
      .catch(() => setStatus("manual"));
  }, []);

  const calculo = useMemo(() => {
    try {
      return { resultados: calcular({ valor, dias, percentualCdiCdb: cdb, percentualCdiLci: lci }, taxas), erro: "" };
    } catch (e) {
      return { resultados: [], erro: e instanceof Error ? e.message : "Erro no cálculo" };
    }
  }, [valor, dias, cdb, lci, taxas]);

  const campoTaxa = (rotulo: string, chave: keyof Taxas) => (
    <label>
      <span>{rotulo}</span>
      <input type="number" step="0.01" value={taxas[chave]}
        onChange={(e) => setTaxas({ ...taxas, [chave]: Number(e.target.value) })} />
    </label>
  );

  const resultados = calculo.resultados;
  const melhor = resultados[0];
  const maiorGanho = Math.max(...resultados.map((r) => r.rendimentoLiquido), 1);

  return (
    <main>
      <header>
        <span className="rotulo">Renda fixa · taxas do Banco Central</span>
        <h1>Onde seu dinheiro<br />rende mais</h1>
        <p className="sub">Compare CDB, LCI/LCA, Tesouro Selic e poupança já descontando imposto, custos e inflação.</p>
      </header>

      <section className="bloco">
        <span className="rotulo">Seu investimento</span>
        <div className="grid">
          <label><span>Valor (R$)</span><input type="number" min="1" value={valor} onChange={(e) => setValor(Number(e.target.value))} /></label>
          <label><span>Prazo (dias)</span><input type="number" min="30" value={dias} onChange={(e) => setDias(Number(e.target.value))} /></label>
          <label><span>CDB (% do CDI)</span><input type="number" value={cdb} onChange={(e) => setCdb(Number(e.target.value))} /></label>
          <label><span>LCI/LCA (% do CDI)</span><input type="number" value={lci} onChange={(e) => setLci(Number(e.target.value))} /></label>
        </div>
      </section>

      <section className="bloco">
        <span className="rotulo">Taxas de referência</span>
        <p className={`status ${status}`}>
          {status === "carregando" && "Buscando no Banco Central"}
          {status === "ok" && `Oficiais, atualizadas em ${dataRef}. Edite para simular.`}
          {status === "manual" && "Banco Central indisponível. Valores de referência editáveis."}
        </p>
        <div className="grid">
          {campoTaxa("Selic (% a.a.)", "selic")}
          {campoTaxa("CDI (% a.a.)", "cdi")}
          {campoTaxa("IPCA 12 meses (%)", "ipca")}
        </div>
      </section>

      <section className="bloco">
        {calculo.erro ? (
          <p className="erro">{calculo.erro}</p>
        ) : (
          <>
            {melhor && (
              <div className="veredito">
                <span className="rotulo">Melhor opção</span>
                <div className="numero">{brl.format(melhor.rendimentoLiquido)}</div>
                <p>de rendimento líquido com <strong>{melhor.nome}</strong> em {dias} dias.</p>
              </div>
            )}
            <span className="rotulo">Comparativo</span>
            <div className="linhas">
              {resultados.map((r, i) => (
                <div className={`linha${i === 0 ? " primeira" : ""}`} key={r.nome}>
                  <span className="nome">{r.nome}</span>
                  <span className="liquido">{brl.format(r.liquido)}</span>
                  <span className="obs">{r.observacao}</span>
                  <span className="detalhe">
                    IR {brl.format(r.imposto)}{r.custos > 0 && ` · custos ${brl.format(r.custos)}`} ·{" "}
                    <span className={r.rentabilidadeRealPct >= 0 ? "pos" : "neg"}>real {pct(r.rentabilidadeRealPct)}</span>
                  </span>
                  <div className="barra"><i style={{ width: `${Math.max(0, (r.rendimentoLiquido / maiorGanho) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <footer>
        Estimativa em dias corridos, sem IOF (prazo mínimo de 30 dias) e sem TR na poupança. Não é recomendação de investimento.
        {" "}<a href="https://github.com/DaviiMoreira/calculadora-renda-fixa">Código no GitHub</a>
      </footer>
    </main>
  );
}
