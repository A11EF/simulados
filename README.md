# Simula

Aplicação web responsiva para criar simulados a partir de arquivos, links públicos ou texto colado, responder às questões e revisar a correção.

## Como abrir

Abra `index.html` no navegador ou use a extensão Live Server do VS Code para rodar o projeto em `localhost`. Para importar links de provas, use `localhost`; abrir como `file://` pode ser bloqueado pelo navegador. Não há etapa de instalação nem dependências de build.

## Fluxo principal

1. Selecione **Novo simulado** e informe um nome.
2. Envie um PDF, imagem, arquivo TXT/JSON, cole um link público ou o texto da prova.
3. Confira e edite as questões, alternativas e gabarito antes de salvar.
4. Responda no computador ou celular. As respostas ficam salvas no navegador enquanto o simulado não for finalizado.
5. Ao terminar, veja a pontuação e a revisão de cada resposta.

Para reconhecer questões no texto, use enunciados numerados (`1.`, `2.` ou `Questão 1:`) e alternativas em linhas identificadas (`A)`, `B)`, etc.). O gabarito é opcional e pode ser indicado, por exemplo, como `Gabarito: 1-B, 2-A`; também pode ser editado na revisão.

Arquivos JSON podem ser uma lista de questões ou um objeto com a propriedade `questions`. Cada questão aceita `text` (ou `question`), `options` e `answer` (ou `correctAnswer`). As alternativas podem ser textos ou objetos `{ "letter": "A", "text": "..." }`.

## Limites desta versão

- PDFs e imagens são lidos no navegador com bibliotecas carregadas de CDNs; a primeira leitura desses formatos requer conexão com a internet. Confira as questões extraídas antes de salvar, pois a formatação e o OCR podem precisar de ajustes.
- O acesso a links depende das permissões do site (CORS). Links que exigem login ou bloqueiam leitura externa devem ser baixados e enviados como arquivo.
- Simulados e resultados ficam no armazenamento local do navegador deste dispositivo. Esta versão não possui contas, sincronização entre dispositivos nem servidor.
