"use strict";

const STORAGE_KEY = "simula-app-v1";
const LETTERS = ["A", "B", "C", "D", "E"];
const VIEW_NAMES = { overview: "Visão geral", exams: "Minhas provas", results: "Resultados" };

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Array.isArray(saved.exams)) {
      return {
        exams: saved.exams.filter((exam) => exam.id !== "demo-ciencias"),
        results: Array.isArray(saved.results) ? saved.results : [],
        streakDays: Number.isFinite(saved.streakDays) ? saved.streakDays : 0
      };
    }
  } catch (error) {
    console.error("Não foi possível carregar os dados salvos.", error);
    showToast("Não foi possível ler os dados salvos neste navegador.", true);
  }
  return { exams: [], results: [], streakDays: 0 };
}

let state = loadState();
let currentView = "overview";
let activeExamId = null;
let activeResultId = null;
let currentQuestionIndex = 0;
let toastTimer = null;
let draftTitle = "";
let draftSourceName = "";

const content = document.getElementById("app-content");
const modalRoot = document.getElementById("modal-root");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Não foi possível salvar os dados.", error);
    showToast("Não foi possível salvar. Verifique o espaço disponível no navegador.", true);
    return false;
  }
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3300);
}

function setActiveNav(view) {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  document.getElementById("page-name").textContent = VIEW_NAMES[view] || "Simulado";
}

function navigate(view) {
  currentView = view;
  activeExamId = null;
  activeResultId = null;
  setActiveNav(view);
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function render() {
  if (activeResultId) {
    renderResultReview(activeResultId);
    return;
  }
  if (activeExamId) {
    renderTest();
    return;
  }
  if (currentView === "exams") renderExams();
  else if (currentView === "results") renderResults();
  else renderOverview();
}

function glyphClass(index) {
  return ["", "mint", "peach"][index % 3];
}

function questionCount(exam) {
  return Array.isArray(exam.questions) ? exam.questions.length : 0;
}

function renderOverview() {
  const latestExams = state.exams.slice(0, 3);
  const average = state.results.filter((result) => result.gradedCount > 0);
  const avgScore = average.length
    ? Math.round(average.reduce((sum, result) => sum + result.percentage, 0) / average.length)
    : 0;
  const completedThisWeek = state.results.filter((result) => {
    const date = new Date(result.completedAt);
    return Number.isFinite(date.getTime()) && Date.now() - date.getTime() < 7 * 86400000;
  }).length;

  content.innerHTML = `
    <section class="welcome-row">
      <div>
        <p class="eyebrow">BOM TER VOCÊ AQUI</p>
        <h1>Seu próximo passo começa agora.</h1>
        <p class="welcome-subtitle">Pratique no seu ritmo e acompanhe sua evolução.</p>
      </div>
      <div class="welcome-actions">
        <button class="primary-button" data-action="create"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Importar prova</button>
      </div>
    </section>

    <section class="hero-card">
      <div class="hero-copy">
        <div class="hero-tag"><span></span> seu espaço de prática</div>
        <h2>Sua prova pronta, agora interativa.</h2>
        <p>Envie um simulado que você já tem, responda às questões e confira seus acertos no final.</p>
      </div>
      <div class="hero-illustration" aria-hidden="true">
        <svg viewBox="0 0 48 48"><path d="M14 8h14l8 8v22H14z"/><path d="M28 8v9h8M19 24h12M19 29h12M19 34h7"/><path d="m9 15 3 3 5-6"/></svg>
      </div>
      <button class="hero-button" data-action="create">Enviar prova <span>→</span></button>
    </section>

    <section>
      <div class="section-heading">
        <div><h2>Seu progresso</h2><p>Pequenos avanços também contam.</p></div>
      </div>
      <div class="stats-grid">
        <article class="stat-card">
          <div class="stat-icon purple"><svg viewBox="0 0 24 24"><path d="M8 4H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><rect x="8" y="2" width="8" height="4" rx="1.5"/><path d="M8 12h8M8 16h5"/></svg></div>
          <div><strong class="stat-number">${state.exams.length}</strong><span class="stat-label">provas importadas</span></div>
        </article>
        <article class="stat-card">
          <div class="stat-icon green"><svg viewBox="0 0 24 24"><path d="M5 12.5 9.5 17 19 7"/></svg></div>
          <div><strong class="stat-number">${state.results.length}</strong><span class="stat-label">simulados concluídos</span></div>
        </article>
        <article class="stat-card">
          <div class="stat-icon orange"><svg viewBox="0 0 24 24"><path d="M12 3v3M5.6 5.6l2.1 2.1m8.6 0 2.1-2.1M4 13h2m12 0h2M8 18h8M9 21h6"/><path d="M8 15a6 6 0 1 1 8 0c-.8.6-1 1.3-1 2H9c0-.7-.2-1.4-1-2Z"/></svg></div>
          <div><strong class="stat-number">${avgScore}%</strong><span class="stat-label">média de acertos</span></div>
        </article>
      </div>
    </section>

    <div class="lower-grid">
      <section class="panel">
        <div class="panel-header"><h2>Suas provas</h2><button class="text-button" data-view="exams">Ver todas <span aria-hidden="true">→</span></button></div>
        <div class="exam-list">
          ${latestExams.length ? latestExams.map((exam, index) => `
            <div class="exam-row">
              <div class="exam-glyph ${glyphClass(index)}" aria-hidden="true">${index === 0 ? "▤" : index === 1 ? "◈" : "✳"}</div>
              <div class="exam-row-copy"><strong>${escapeHtml(exam.title)}</strong><small>${escapeHtml(exam.subject || "Geral")} · ${questionCount(exam)} questões</small></div>
              <button class="row-action" data-action="start" data-id="${escapeHtml(exam.id)}" aria-label="Responder ${escapeHtml(exam.title)}">→</button>
            </div>`).join("") : `<div class="empty-state"><p>As provas que você importar vão aparecer aqui.</p></div>`}
        </div>
      </section>
      <section class="panel streak-card">
        <div class="streak-top"><h2>Seu ritmo de estudos</h2><span class="streak-emoji" aria-hidden="true">✦</span></div>
        <div class="streak-number">${completedThisWeek}<span> ${completedThisWeek === 1 ? "simulado" : "simulados"} nesta semana</span></div>
        <p class="streak-caption">${completedThisWeek ? "Continue praticando. Você está no caminho!" : "Um simulado já é um ótimo começo."}</p>
        <div class="week-dots" aria-label="Dias da semana">
          ${["D", "S", "T", "Q", "Q", "S", "S"].map((day, i) => `<div class="day-dot ${i === new Date().getDay() && completedThisWeek ? "done" : ""}"><span>${i === new Date().getDay() && completedThisWeek ? "✓" : "·"}</span>${day}</div>`).join("")}
        </div>
      </section>
    </div>`;
}

function renderExams() {
  content.innerHTML = `
    <section class="page-title-row">
      <div><p class="eyebrow">SUA BIBLIOTECA</p><h1>Minhas provas</h1><p>Simulados que você importou e pode responder.</p></div>
      <button class="primary-button" data-action="create"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Importar prova</button>
    </section>
    ${state.exams.length ? `<div class="exam-grid">${state.exams.map((exam, index) => `
      <article class="exam-card">
        <div class="exam-card-top"><div class="exam-card-icon" aria-hidden="true">${index % 2 === 0 ? "▤" : "◈"}</div><button class="more-button" data-action="delete-exam" data-id="${escapeHtml(exam.id)}" aria-label="Excluir ${escapeHtml(exam.title)}" title="Excluir simulado">•••</button></div>
        <h3>${escapeHtml(exam.title)}</h3>
        <div class="exam-card-meta">${escapeHtml(exam.subject || "Geral")} · ${questionCount(exam)} ${questionCount(exam) === 1 ? "questão" : "questões"}</div>
        <div class="exam-card-footer"><small>Criado ${formatDate(exam.createdAt)}</small><button class="small-primary" data-action="start" data-id="${escapeHtml(exam.id)}">Responder →</button></div>
      </article>`).join("")}</div>` : emptyState("Nenhuma prova importada", "Envie o simulado que você já tem. O app lê as questões para você responder e corrigir no final.", "Importar prova")}
  `;
}

function renderResults() {
  const results = [...state.results].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  content.innerHTML = `
    <section class="page-title-row"><div><p class="eyebrow">ACOMPANHE SUA EVOLUÇÃO</p><h1>Resultados</h1><p>Veja como você foi nos simulados que já respondeu.</p></div></section>
    ${results.length ? `<div class="result-list">${results.map((result) => {
      const exam = state.exams.find((item) => item.id === result.examId);
      return `<article class="result-card">
        <div class="result-score ${result.gradedCount ? "" : "no-grade"}">${result.gradedCount ? `${result.percentage}%` : "—"}</div>
        <div class="result-info"><h3>${escapeHtml(result.examTitle || exam?.title || "Simulado")}</h3><p>${result.correct} acertos de ${result.gradedCount || result.total} corrigidas · ${result.total} questões no total</p></div>
        <span class="result-date">${formatDate(result.completedAt)}</span>
        <button class="outline-button" data-action="review" data-id="${escapeHtml(result.id)}">Revisar</button>
      </article>`;
    }).join("")}</div>` : emptyState("Ainda sem resultados", "Quando terminar um simulado, sua correção e seu histórico aparecerão aqui.", "Escolher um simulado", "exams")}
  `;
}

function emptyState(title, message, actionLabel, view = null) {
  return `<section class="empty-state"><div class="empty-state-icon" aria-hidden="true">✦</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><button class="primary-button" ${view ? `data-view="${view}"` : 'data-action="create"'}>${escapeHtml(actionLabel)}</button></section>`;
}

function formatDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "recentemente";
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(date);
}

function startExam(id) {
  const exam = state.exams.find((item) => item.id === id);
  if (!exam || !exam.questions.length) {
    showToast("Este simulado não tem questões para responder.", true);
    return;
  }
  activeExamId = id;
  currentQuestionIndex = 0;
  currentView = "test";
  document.getElementById("page-name").textContent = exam.title;
  renderTest();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderTest() {
  const exam = state.exams.find((item) => item.id === activeExamId);
  if (!exam) {
    activeExamId = null;
    navigate("exams");
    return;
  }
  const question = exam.questions[currentQuestionIndex];
  const answers = exam.draftAnswers || (exam.draftAnswers = {});
  const answeredCount = Object.keys(answers).filter((key) => exam.questions.some((item) => item.id === key)).length;
  const percent = Math.round(((currentQuestionIndex + 1) / exam.questions.length) * 100);
  content.innerHTML = `
    <div class="test-top">
      <button class="back-button" data-action="exit-test"><span aria-hidden="true">←</span> Sair do simulado</button>
      <span class="test-progress-copy">Questão ${currentQuestionIndex + 1} de ${exam.questions.length}</span>
    </div>
    <div class="progress-track" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${percent}%"></div></div>
    <div class="test-layout">
      <section class="question-card">
        <div class="question-kicker">${escapeHtml(exam.subject || "Simulado")} <span aria-hidden="true">·</span> Questão ${currentQuestionIndex + 1}</div>
        <h1>${escapeHtml(question.text)}</h1>
        <div class="answer-list" role="radiogroup" aria-label="Alternativas da questão ${currentQuestionIndex + 1}">
          ${question.options.map((option) => `<button class="answer-option ${answers[question.id] === option.letter ? "is-selected" : ""}" role="radio" aria-checked="${answers[question.id] === option.letter}" data-action="answer" data-letter="${escapeHtml(option.letter)}">
            <span class="option-letter">${escapeHtml(option.letter)}</span><span class="option-text">${escapeHtml(option.text)}</span>
          </button>`).join("")}
        </div>
        ${question.answer ? "" : `<p class="no-key-note">Esta questão ainda não tem gabarito. Sua resposta será registrada, mas não contará na correção.</p>`}
        <div class="question-controls">
          <button class="secondary-button" data-action="previous" ${currentQuestionIndex === 0 ? "disabled" : ""}>← Anterior</button>
          ${currentQuestionIndex < exam.questions.length - 1
            ? `<button class="primary-button" data-action="next">Próxima questão <span aria-hidden="true">→</span></button>`
            : `<button class="primary-button" data-action="submit-test">Finalizar simulado</button>`}
        </div>
      </section>
      <aside class="question-nav-card">
        <h2>Questões</h2><p>${answeredCount} de ${exam.questions.length} respondidas</p>
        <div class="question-numbers">
          ${exam.questions.map((item, index) => `<button class="question-number ${index === currentQuestionIndex ? "is-current" : ""} ${answers[item.id] ? "is-answered" : ""}" data-action="jump" data-index="${index}" aria-label="Ir para questão ${index + 1}">${index + 1}</button>`).join("")}
        </div>
        <button class="text-button submit-link" data-action="submit-test">Finalizar e corrigir →</button>
      </aside>
    </div>`;
}

function submitExam() {
  const exam = state.exams.find((item) => item.id === activeExamId);
  if (!exam) return;
  const answers = exam.draftAnswers || {};
  const unanswered = exam.questions.filter((question) => !answers[question.id]).length;
  if (unanswered && !window.confirm(`Você ainda não respondeu ${unanswered} ${unanswered === 1 ? "questão" : "questões"}. Deseja finalizar mesmo assim?`)) return;
  const graded = exam.questions.filter((question) => question.answer);
  const correct = graded.filter((question) => answers[question.id] === question.answer).length;
  const result = {
    id: createId(),
    examId: exam.id,
    examTitle: exam.title,
    completedAt: new Date().toISOString(),
    total: exam.questions.length,
    gradedCount: graded.length,
    correct,
    percentage: graded.length ? Math.round((correct / graded.length) * 100) : 0,
    answers: { ...answers }
  };
  state.results.push(result);
  exam.draftAnswers = {};
  saveState();
  activeExamId = null;
  activeResultId = result.id;
  currentView = "review";
  document.getElementById("page-name").textContent = "Seu resultado";
  renderResultReview(result.id);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderResultReview(resultId) {
  const result = state.results.find((item) => item.id === resultId);
  const exam = result && state.exams.find((item) => item.id === result.examId);
  if (!result || !exam) {
    activeResultId = null;
    navigate("results");
    return;
  }
  const angle = result.gradedCount ? Math.round((result.percentage / 100) * 360) : 0;
  const heading = !result.gradedCount ? "Respostas registradas!" : result.percentage >= 70 ? "Mandou muito bem!" : "Praticar também é evoluir.";
  const description = result.gradedCount
    ? `Você acertou ${result.correct} de ${result.gradedCount} questões com gabarito.`
    : "Suas respostas foram registradas, mas este simulado não tem gabarito para correção.";
  content.innerHTML = `
    <div class="test-top"><button class="back-button" data-action="back-results"><span aria-hidden="true">←</span> Voltar aos resultados</button><span class="test-progress-copy">${formatDate(result.completedAt)}</span></div>
    <section class="result-hero">
      <div class="result-donut" style="--score-angle:${angle}deg"><div class="result-donut-inner"><strong>${result.gradedCount ? `${result.percentage}%` : "—"}</strong><span>${result.gradedCount ? "aproveitamento" : "sem gabarito"}</span></div></div>
      <h1>${heading}</h1><p>${description}</p>
      <div class="result-stats">
        <div class="result-stat"><strong>${result.correct}</strong><span>acertos</span></div>
        <div class="result-stat"><strong>${Math.max(0, result.gradedCount - result.correct)}</strong><span>para revisar</span></div>
        <div class="result-stat"><strong>${result.total}</strong><span>questões</span></div>
      </div>
    </section>
    <div class="section-heading"><div><h2>Revisão das respostas</h2><p>${escapeHtml(exam.title)}</p></div></div>
    <div class="review-list">${exam.questions.map((question, index) => {
      const given = result.answers[question.id];
      const selected = question.options.find((option) => option.letter === given);
      const correctOption = question.options.find((option) => option.letter === question.answer);
      const isCorrect = Boolean(question.answer && given === question.answer);
      return `<article class="review-item ${question.answer ? isCorrect ? "is-correct" : "is-wrong" : ""}">
        <h3>${index + 1}. ${escapeHtml(question.text)}</h3>
        <p>Sua resposta: ${selected ? `${escapeHtml(selected.letter)} — ${escapeHtml(selected.text)}` : "Não respondida"}</p>
        ${question.answer ? `<p class="correct-answer">Gabarito: ${escapeHtml(question.answer)}${correctOption ? ` — ${escapeHtml(correctOption.text)}` : ""}</p>` : `<p>Sem gabarito cadastrado.</p>`}
      </article>`;
    }).join("")}</div>
    <div class="result-actions"><button class="secondary-button" data-action="back-results">Ver histórico</button><button class="primary-button" data-action="retry" data-id="${escapeHtml(exam.id)}">Tentar novamente</button></div>`;
}

function openCreateModal() {
  draftTitle = "";
  draftSourceName = "";
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header"><div><h2 id="modal-title">Importar prova pronta</h2><p>Envie um simulado existente. Vamos ler as questões e o gabarito.</p></div><button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button></div>
        <div class="modal-body" id="modal-body">${sourceStageHtml()}</div>
      </section>
    </div>`;
  modalRoot.querySelector("#exam-file").focus();
}

function sourceStageHtml() {
  return `
    <div class="form-grid">
      <div class="field"><label for="exam-title">Nome da prova <span style="font-weight:400;color:#9699a8">(opcional)</span></label><input id="exam-title" name="exam-title" placeholder="Usaremos o nome do arquivo" maxlength="80" /></div>
    </div>
    <label class="upload-zone" id="upload-zone">
      <span class="upload-icon"><svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L8 8m4-4 4 4"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg></span>
      <strong id="upload-title">Selecionar o arquivo do simulado</strong>
      <small id="upload-name">PDF, JPG, PNG, TXT ou JSON · até 15 MB</small>
      <input type="file" id="exam-file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.md,.json,application/pdf,image/jpeg,image/png,image/webp,text/plain,application/json" />
    </label>
    <div class="source-divider">ou use o link público da prova</div>
    <div class="field"><label for="exam-url">Link da prova</label><input id="exam-url" name="exam-url" type="url" placeholder="https://exemplo.com/prova.pdf" /><p class="field-help">O site precisa permitir leitura pelo navegador. Se o link não abrir, baixe o arquivo e envie acima.</p></div>
    <div class="source-divider">ou cole o texto da prova</div>
    <div class="field"><label for="exam-text">Texto das questões</label><textarea id="exam-text" placeholder="Exemplo:&#10;1. Qual é a capital do Brasil?&#10;A) São Paulo&#10;B) Brasília&#10;C) Salvador&#10;D) Recife&#10;&#10;2. ...&#10;&#10;Gabarito: 1-B, 2-A"></textarea><p class="field-help">O texto precisa ter questões numeradas e alternativas identificadas. Para corrigir, inclua o gabarito no mesmo arquivo ou texto.</p></div>
    <div id="parser-status" aria-live="polite"></div>
    <div class="modal-footer"><span class="field-help">A prova fica salva só neste navegador.</span><div class="right-actions"><button class="primary-button" data-action="parse-source">Importar e responder <span aria-hidden="true">→</span></button></div></div>`;
}

function parseQuestionText(rawText) {
  const text = rawText.replace(/\r/g, "\n").replace(/\u00a0/g, " ");
  const pages = text.split(/^\s*\[\[PAGE \d+\]\]\s*$/m);
  const pageAware = pages.length > 1;
  const isKeyPage = (page) => /^\s*gabarito(?:\s+comentado)?\s*$/im.test(page);
  const isCommentaryPage = (page) => /^\s*\d{1,3}\.\s*Resposta:\s*[A-D]\b/im.test(page);
  const isNonQuestionPage = (page) => /^\s*(?:INSTRU[CÇ][OÕ]ES|CART[AÃ]O DE RESPOSTAS|FOLHA DE RESPOSTAS)\s*$/im.test(page);
  const keyPages = pageAware ? pages.filter(isKeyPage) : [];
  const questionPages = pageAware
    ? pages
      .filter((page) => !isKeyPage(page) && !isCommentaryPage(page) && !isNonQuestionPage(page))
      .map((page) => page.split("\n").filter((line) => !/·\s*pág(?:ina)?\.?\s*\d+/i.test(line)).join("\n"))
    : pages;
  const lines = questionPages.join("\n").split("\n");
  const keyStart = lines.findIndex((line) => /^\s*(?:gabarito|respostas?\s+corretas?)\b/i.test(line));
  const questionLines = pageAware || keyStart < 0 ? lines : lines.slice(0, keyStart);
  const keyText = [...keyPages, ...(keyStart >= 0 ? [lines.slice(keyStart).join("\n")] : [])].join("\n");
  const key = {};
  const keyPattern = /(?:quest(?:a|ã)o\s*)?(\d{1,3})\s*[-.:)]?\s*([A-E])\b/gi;
  let match;
  while ((match = keyPattern.exec(keyText)) !== null) key[Number(match[1])] = match[2].toUpperCase();

  const blocks = [];
  let current = null;
  for (const line of questionLines) {
    const start = line.match(/^\s*(?:quest(?:a|ã)o\s*)?(\d{1,3})\s*[.)\-:]\s*(.*)$/i);
    if (start) {
      if (current) blocks.push(current);
      current = { number: Number(start[1]), lines: [start[2]] };
    } else if (current && line.trim()) {
      current.lines.push(line.trim());
    }
  }
  if (current) blocks.push(current);

  const questions = blocks.map((block, index) => {
    const body = block.lines.join("\n").trim();
    const optionPattern = /(?:^|\n)\s*(?:\(([A-E])\)|([A-E])\s*[).:\-])\s*(.*)/g;
    const optionMatches = [];
    let optionMatch;
    while ((optionMatch = optionPattern.exec(body)) !== null) {
      const optionText = optionMatch[3];
      optionMatches.push({
        letter: (optionMatch[1] || optionMatch[2]).toUpperCase(),
        start: optionMatch.index + (optionMatch[0].startsWith("\n") ? 1 : 0),
        contentStart: optionMatch.index + optionMatch[0].length - optionText.length,
        text: optionText
      });
    }
    let stem = body;
    const options = [];
    if (optionMatches.length) {
      stem = body.slice(0, optionMatches[0].start).trim();
      optionMatches.forEach((option, optionIndex) => {
        const next = optionMatches[optionIndex + 1];
        const end = next ? next.start : body.length;
        const text = body.slice(option.contentStart, end).trim().replace(/\s*\n\s*/g, " ");
        options.push({ letter: option.letter, text: text || option.text.trim() });
      });
    }
    const uniqueOptions = options.filter((option, optionIndex) => options.findIndex((item) => item.letter === option.letter) === optionIndex);
    return {
      id: createId(),
      text: stem.replace(/\s*\n\s*/g, " ").trim(),
      options: uniqueOptions.length ? uniqueOptions : LETTERS.slice(0, 4).map((letter) => ({ letter, text: "" })),
      answer: key[block.number] || ""
    };
  }).filter((question) => question.text || question.options.some((option) => option.text));
  return questions;
}

function parseJsonExam(rawText) {
  const data = JSON.parse(rawText);
  const source = Array.isArray(data) ? data : data.questions;
  if (!Array.isArray(source)) throw new Error("O JSON precisa conter uma lista de questões em \"questions\".");
  return source.map((item, index) => {
    const rawOptions = Array.isArray(item.options) ? item.options : [];
    const options = rawOptions.map((option, optionIndex) => {
      if (typeof option === "string") return { letter: LETTERS[optionIndex] || String(optionIndex + 1), text: option };
      return { letter: String(option.letter || LETTERS[optionIndex] || "").toUpperCase(), text: String(option.text || "") };
    });
    return {
      id: createId(),
      text: String(item.text || item.question || ""),
      options,
      answer: String(item.answer || item.correctAnswer || "").toUpperCase()
    };
  });
}

async function loadScript(src, globalName) {
  if (window[globalName]) return window[globalName];
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => window[globalName] ? resolve(window[globalName]) : reject(new Error("A biblioteca de leitura não ficou disponível."));
    script.onerror = () => reject(new Error("Não foi possível carregar a ferramenta de leitura. Verifique sua conexão e tente novamente."));
    document.head.appendChild(script);
  });
}

async function extractPdfText(file, status) {
  status("Carregando leitor de PDF…");
  const pdfjs = await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", "pdfjsLib");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const documentPdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  if (documentPdf.numPages > 100) throw new Error("Este PDF tem mais de 100 páginas. Envie apenas as páginas que contêm o simulado.");
  let output = "";
  for (let pageNumber = 1; pageNumber <= documentPdf.numPages; pageNumber += 1) {
    status(`Lendo página ${pageNumber} de ${documentPdf.numPages}…`);
    const page = await documentPdf.getPage(pageNumber);
    const pageText = await page.getTextContent();
    output += `\n[[PAGE ${pageNumber}]]\n${pageText.items.map((item) => item.str || "").join("\n")}\n`;
  }
  return output;
}

async function extractImageText(file, status) {
  status("Carregando leitura de imagem…");
  const tesseract = await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js", "Tesseract");
  const worker = await tesseract.createWorker("por", 1, {
    logger: (event) => {
      if (event.status === "recognizing text") status(`Reconhecendo texto da imagem… ${Math.round((event.progress || 0) * 100)}%`);
    }
  });
  try {
    const result = await worker.recognize(file);
    return result.data.text;
  } finally {
    await worker.terminate();
  }
}

function setParserStatus(message, kind = "") {
  const status = modalRoot.querySelector("#parser-status");
  if (!status) return;
  status.textContent = message;
  status.className = message ? `parser-status ${kind}` : "";
}

async function readOnlineSource(sourceUrl, status) {
  let url;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new Error("Informe um link válido começando com https:// ou http://.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("O link precisa começar com https:// ou http://.");
  }
  status("Buscando o conteúdo do link…");
  let response;
  try {
    response = await fetch(url.href, { credentials: "omit" });
  } catch {
    throw new Error("Não foi possível acessar esse link. O site pode bloquear leitura externa (CORS); baixe a prova e envie o arquivo.");
  }
  if (!response.ok) throw new Error(`O site respondeu com erro ${response.status}. Confira o link ou baixe a prova.`);
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > 15 * 1024 * 1024) throw new Error("O arquivo do link excede o limite de 15 MB.");
  const blob = await response.blob();
  if (blob.size > 15 * 1024 * 1024) throw new Error("O arquivo do link excede o limite de 15 MB.");

  const contentType = (response.headers.get("content-type") || blob.type).toLowerCase();
  const pathName = decodeURIComponent(url.pathname.split("/").pop() || "prova");
  const extension = pathName.split(".").pop().toLowerCase();
  if (contentType.includes("text/html") || extension === "html" || extension === "htm") {
    const documentPage = new DOMParser().parseFromString(await blob.text(), "text/html");
    documentPage.querySelectorAll("script,style,noscript,svg").forEach((element) => element.remove());
    return { text: documentPage.body.innerText || documentPage.body.textContent || "", file: null };
  }
  if (contentType.includes("json") || extension === "json") {
    return { text: await blob.text(), file: new File([blob], pathName.endsWith(".json") ? pathName : "prova.json", { type: "application/json" }) };
  }
  if (contentType.startsWith("text/") || ["txt", "md"].includes(extension)) {
    return { text: await blob.text(), file: null };
  }
  let fileName = pathName;
  if (!fileName.includes(".")) {
    if (contentType.includes("pdf")) fileName += ".pdf";
    else if (contentType.includes("png")) fileName += ".png";
    else if (contentType.includes("webp")) fileName += ".webp";
    else if (contentType.includes("jpeg")) fileName += ".jpg";
  }
  return { text: "", file: new File([blob], fileName, { type: contentType }) };
}

async function parseSource() {
  const title = modalRoot.querySelector('[name="exam-title"]').value.trim();
  let file = modalRoot.querySelector("#exam-file").files[0];
  const sourceUrl = modalRoot.querySelector('[name="exam-url"]').value.trim();
  const pasted = modalRoot.querySelector("#exam-text").value.trim();
  if ([Boolean(file), Boolean(sourceUrl), Boolean(pasted)].filter(Boolean).length > 1) {
    setParserStatus("Use apenas uma fonte por vez: arquivo, link ou texto colado.", "error");
    return;
  }
  if (!file && !sourceUrl && !pasted) {
    setParserStatus("Escolha um arquivo, informe um link ou cole o texto das questões.", "error");
    return;
  }
  if (file && file.size > 15 * 1024 * 1024) {
    setParserStatus("O arquivo excede o limite de 15 MB.", "error");
    return;
  }
  const button = modalRoot.querySelector('[data-action="parse-source"]');
  button.disabled = true;
  button.textContent = "Lendo prova…";
  draftSourceName = file?.name || sourceUrl || "Texto colado";
  const status = (message) => setParserStatus(message);
  try {
    let text = pasted;
    let jsonData = null;
    if (sourceUrl) {
      const onlineSource = await readOnlineSource(sourceUrl, status);
      file = onlineSource.file;
      text = onlineSource.text;
      draftSourceName = sourceUrl;
    }
    if (file) {
      const extension = file.name.split(".").pop().toLowerCase();
      if (extension === "json") {
        jsonData = await file.text();
      } else if (["txt", "md"].includes(extension) || file.type.startsWith("text/")) {
        text = await file.text();
      } else if (extension === "pdf" || file.type === "application/pdf") {
        text = await extractPdfText(file, status);
      } else if (["jpg", "jpeg", "png", "webp"].includes(extension) || file.type.startsWith("image/")) {
        text = await extractImageText(file, status);
      } else {
        throw new Error("Formato não reconhecido. Envie PDF, JPG, PNG, WEBP, TXT ou JSON.");
      }
    }
    const questions = jsonData !== null ? parseJsonExam(jsonData) : parseQuestionText(text);
    if (!questions.length) throw new Error("Não encontrei questões no arquivo. Envie um PDF com texto selecionável ou um arquivo TXT/JSON.");
    const invalidQuestions = questions.filter((question) =>
      !question.text || question.options.filter((option) => option.text).length < 2
    );
    if (invalidQuestions.length) {
      throw new Error(`O arquivo foi lido, mas ${invalidQuestions.length} ${invalidQuestions.length === 1 ? "questão ficou incompleta" : "questões ficaram incompletas"}. Confira se o PDF permite selecionar/copiar o texto.`);
    }
    questions.forEach((question) => {
      question.options = question.options.filter((option) => option.text);
      if (!question.options.some((option) => option.letter === question.answer)) question.answer = "";
    });
    const inferredName = (file?.name || sourceUrl.split("/").pop() || "Prova importada")
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim()
      .replace(/(^|\s)\S/g, (letter) => letter.toLocaleUpperCase("pt-BR"));
    const exam = {
      id: createId(),
      title: title || inferredName || "Prova importada",
      subject: "",
      sourceName: draftSourceName,
      createdAt: new Date().toISOString(),
      questions,
      draftAnswers: {}
    };
    state.exams.unshift(exam);
    if (!saveState()) {
      state.exams = state.exams.filter((item) => item.id !== exam.id);
      throw new Error("Não foi possível salvar a prova neste navegador.");
    }
    modalRoot.innerHTML = "";
    startExam(exam.id);
    const gradedCount = questions.filter((question) => question.answer).length;
    showToast(gradedCount
      ? `Prova importada: ${questions.length} questões e ${gradedCount} respostas do gabarito encontradas.`
      : `Prova importada com ${questions.length} questões. Não encontrei gabarito para corrigir.`);
  } catch (error) {
    console.error("Falha ao ler a prova.", error);
    setParserStatus(error instanceof Error ? error.message : "Não foi possível ler esse arquivo.", "error");
    button.disabled = false;
    button.innerHTML = 'Tentar novamente <span aria-hidden="true">→</span>';
  }
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `q-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function handleClick(event) {
  const button = event.target.closest("[data-action], [data-view], [data-view-link]");
  if (!button) return;
  if (button.dataset.viewLink) {
    event.preventDefault();
    navigate(button.dataset.viewLink);
    return;
  }
  if (button.dataset.view) {
    navigate(button.dataset.view);
    return;
  }
  const action = button.dataset.action;
  switch (action) {
    case "create": openCreateModal(); break;
    case "close-modal": modalRoot.innerHTML = ""; break;
    case "backdrop-close": if (event.target === button) modalRoot.innerHTML = ""; break;
    case "about": showToast("Envie um simulado pronto. O app lê as questões e o gabarito para você responder e corrigir."); break;
    case "parse-source": parseSource(); break;
    case "start": startExam(button.dataset.id); break;
    case "answer": {
      const exam = state.exams.find((item) => item.id === activeExamId);
      const question = exam?.questions[currentQuestionIndex];
      if (!question) return;
      exam.draftAnswers = exam.draftAnswers || {};
      exam.draftAnswers[question.id] = button.dataset.letter;
      saveState();
      renderTest();
      break;
    }
    case "previous":
      currentQuestionIndex = Math.max(0, currentQuestionIndex - 1);
      renderTest();
      break;
    case "next": {
      const exam = state.exams.find((item) => item.id === activeExamId);
      currentQuestionIndex = Math.min(exam.questions.length - 1, currentQuestionIndex + 1);
      renderTest();
      break;
    }
    case "jump":
      currentQuestionIndex = Number(button.dataset.index);
      renderTest();
      break;
    case "submit-test": submitExam(); break;
    case "exit-test":
      if (window.confirm("Quer sair? Suas respostas ficarão salvas para continuar depois.")) {
        activeExamId = null;
        navigate("exams");
      }
      break;
    case "review":
      activeResultId = button.dataset.id;
      currentView = "review";
      document.getElementById("page-name").textContent = "Seu resultado";
      renderResultReview(activeResultId);
      break;
    case "back-results": activeResultId = null; navigate("results"); break;
    case "retry": activeResultId = null; startExam(button.dataset.id); break;
    case "delete-exam": {
      const exam = state.exams.find((item) => item.id === button.dataset.id);
      if (!exam || !window.confirm(`Excluir "${exam.title}"? Os resultados anteriores serão mantidos.`)) return;
      state.exams = state.exams.filter((item) => item.id !== exam.id);
      saveState();
      renderExams();
      showToast("Simulado excluído.");
      break;
    }
    default: break;
  }
}

document.addEventListener("click", handleClick);
document.addEventListener("change", (event) => {
  if (event.target.matches("#exam-file")) {
    const file = event.target.files[0];
    if (!file) return;
    document.getElementById("upload-title").textContent = "Arquivo selecionado";
    document.getElementById("upload-name").textContent = file.name;
    document.getElementById("upload-zone").classList.add("has-file");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modalRoot.firstElementChild) modalRoot.innerHTML = "";
  if (!activeExamId || event.altKey || event.ctrlKey || event.metaKey) return;
  const exam = state.exams.find((item) => item.id === activeExamId);
  if (!exam) return;
  if (["a", "b", "c", "d", "e"].includes(event.key.toLowerCase())) {
    const letter = event.key.toUpperCase();
    const question = exam.questions[currentQuestionIndex];
    if (question.options.some((option) => option.letter === letter)) {
      exam.draftAnswers = exam.draftAnswers || {};
      exam.draftAnswers[question.id] = letter;
      saveState();
      renderTest();
    }
  } else if (event.key === "ArrowRight" && currentQuestionIndex < exam.questions.length - 1) {
    currentQuestionIndex += 1;
    renderTest();
  } else if (event.key === "ArrowLeft" && currentQuestionIndex > 0) {
    currentQuestionIndex -= 1;
    renderTest();
  }
});

document.getElementById("today-label").textContent = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short", day: "numeric", month: "short"
}).format(new Date());
setActiveNav("overview");
render();
