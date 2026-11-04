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
      {rotulo}
      <input type="number" step="0.01" value={taxas[chave]}
        onChange={(e) => setTaxas({ ...taxas, [chave]: Number(e.target.value) })} />
    </label>
  );

  const melhor = calculo.resultados[0];

  return (
    <main>
      <header>
        <h1>Calculadora de Renda Fixa</h1>
        <p className="sub">Compare CDB, LCI/LCA, Tesouro Selic e poupança com as taxas oficiais do Banco Central.</p>
      </header>

      <section className="card">
        <h2>Seu investimento</h2>
        <div className="grid">
          <label>Valor (R$)<input type="number" min="1" value={valor} onChange={(e) => setValor(Number(e.target.value))} /></label>
          <label>Prazo (dias)<input type="number" min="30" value={dias} onChange={(e) => setDias(Number(e.target.value))} /></label>
          <label>CDB (% do CDI)<input type="number" value={cdb} onChange={(e) => setCdb(Number(e.target.value))} /></label>
          <label>LCI/LCA (% do CDI)<input type="number" value={lci} onChange={(e) => setLci(Number(e.target.value))} /></label>
        </div>
      </section>

      <section className="card">
        <h2>Taxas</h2>
        <p className={`status ${status}`}>
          {status === "carregando" && "Buscando taxas no Banco Central..."}
          {status === "ok" && `Taxas oficiais do Banco Central, atualizadas em ${dataRef}. Você pode editar para simular.`}
          {status === "manual" && "Não foi possível consultar o Banco Central agora. Usando valores de referência editáveis."}
        </p>
        <div className="grid three">
          {campoTaxa("Selic (% a.a.)", "selic")}
          {campoTaxa("CDI (% a.a.)", "cdi")}
          {campoTaxa("IPCA 12 meses (%)", "ipca")}
        </div>
      </section>

      {calculo.erro ? (
        <p className="erro">{calculo.erro}</p>
      ) : (
        <section className="card">
          <h2>Resultado</h2>
          {melhor && (
            <p className="destaque">
              Melhor opção: <strong>{melhor.nome}</strong>, com {brl.format(melhor.rendimentoLiquido)} de rendimento líquido.
            </p>
          )}
          <div className="tabela">
            <table>
              <thead>
                <tr><th>Investimento</th><th>Bruto</th><th>IR</th><th>Custos</th><th>Líquido</th><th>Ganho real</th></tr>
              </thead>
              <tbody>
                {calculo.resultados.map((r) => (
                  <tr key={r.nome}>
                    <td><strong>{r.nome}</strong><small>{r.observacao}</small></td>
                    <td>{brl.format(r.bruto)}</td>
                    <td>{brl.format(r.imposto)}</td>
                    <td>{brl.format(r.custos)}</td>
                    <td><strong>{brl.format(r.liquido)}</strong></td>
                    <td className={r.rentabilidadeRealPct >= 0 ? "pos" : "neg"}>{pct(r.rentabilidadeRealPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer>
        Estimativa em dias corridos, sem IOF (prazo mínimo de 30 dias) e sem TR na poupança. Não é recomendação de investimento.
        {" "}<a href="https://github.com/DaviiMoreira/calculadora-renda-fixa">Código no GitHub</a>
      </footer>
    </main>
  );
}
