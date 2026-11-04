# Calculadora de Renda Fixa

Compara CDB, LCI/LCA, Tesouro Selic e poupança usando as taxas oficiais do dia (Selic, CDI e IPCA), consultadas na API SGS do Banco Central do Brasil. Mostra valor bruto, imposto de renda, custos, valor líquido e o ganho real acima da inflação, já ordenando da melhor para a pior opção.

## Tecnologias

React 18, TypeScript, Vite, Vitest e uma função serverless na Vercel que consulta o Banco Central e guarda o resultado em cache por uma hora.

## Como funciona

A regra de negócio fica isolada em `src/calc.ts`, sem dependência de interface, e é coberta por testes em `src/calc.test.ts`. Ela aplica a tabela regressiva de IR (22,5% até 180 dias, chegando a 15% acima de 720), a regra da poupança (0,5% ao mês com Selic acima de 8,5%, senão 70% da Selic) e a taxa de custódia de 0,20% ao ano da B3 no Tesouro Selic, cobrada só sobre o que passa de R$ 10 mil.

A função `api/taxas.ts` busca as séries 432 (Selic meta), 4389 (CDI anualizado) e 13522 (IPCA acumulado em 12 meses). Se o Banco Central estiver fora do ar, a interface continua funcionando com valores de referência que o usuário pode editar.

## Rodando localmente

```bash
npm install
npm test
npm run dev
```

## Limitações conhecidas

O cálculo usa dias corridos em vez de dias úteis, desconsidera a TR na poupança e não calcula IOF, por isso o prazo mínimo é de 30 dias. É uma estimativa, não recomendação de investimento.
