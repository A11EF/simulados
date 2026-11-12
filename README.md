# Simula

Aplicação web responsiva para importar um simulado pronto, responder às questões e conferir a correção.

## Como abrir

Abra `index.html` no navegador ou use a extensão Live Server do VS Code para rodar o projeto em `localhost`. Para importar links de provas, use `localhost`; abrir como `file://` pode ser bloqueado pelo navegador. Não há etapa de instalação nem dependências de build.

## Como usar

1. Selecione **Importar prova**.
2. Envie o PDF do simulado (ou um arquivo de texto/JSON, imagem, link público ou texto colado).
3. O app tenta ler as questões e o gabarito automaticamente e abre o simulado para você responder.
4. Ao finalizar, veja a pontuação e a revisão das respostas.

PDFs com texto selecionável são lidos no navegador. A leitura de imagens e PDFs requer conexão com a internet para carregar as ferramentas de leitura. O reconhecimento depende da formatação do arquivo.

Para reconhecer questões em texto, numere os enunciados (`1.`, `2.` ou `Questão 1:`) e identifique as alternativas como `A)`, `(A)`, `A.` ou `A:`. O gabarito pode estar no mesmo arquivo em formato como `Gabarito: 1-B, 2-A` ou `01: B`.

Arquivos JSON podem ser uma lista de questões ou um objeto com a propriedade `questions`. Cada questão aceita `text` (ou `question`), `options` e `answer` (ou `correctAnswer`). As alternativas podem ser textos ou objetos `{ "letter": "A", "text": "..." }`.

Simulados e resultados ficam no armazenamento local do navegador deste dispositivo. Esta versão não possui contas, sincronização entre dispositivos nem servidor. Se o PDF não contiver um gabarito legível, o app registra as respostas, mas não consegue corrigi-las automaticamente.
