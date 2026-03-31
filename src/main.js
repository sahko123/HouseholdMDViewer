import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { save, open } from "@tauri-apps/plugin-dialog";
import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/core";
// hljs themes loaded as CSS text for dynamic switching
import hljsDark from "highlight.js/styles/github-dark-dimmed.css?inline";
import hljsLight from "highlight.js/styles/github.css?inline";

// Register common languages
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import css from "highlight.js/lib/languages/css";
import html from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import csharp from "highlight.js/lib/languages/csharp";
import cpp from "highlight.js/lib/languages/cpp";
import java from "highlight.js/lib/languages/java";
import rust from "highlight.js/lib/languages/rust";
import go from "highlight.js/lib/languages/go";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import diff from "highlight.js/lib/languages/diff";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", html);
hljs.registerLanguage("xml", html);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("cs", csharp);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("c", cpp);
hljs.registerLanguage("java", java);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("rs", rust);
hljs.registerLanguage("go", go);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("yml", yaml);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("md", markdown);
hljs.registerLanguage("diff", diff);

// Configure marked with syntax highlighting
const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }) {
  let highlighted;
  if (lang && hljs.getLanguage(lang)) {
    highlighted = hljs.highlight(text, { language: lang }).value;
  } else {
    highlighted = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  const langClass = lang ? ` class="language-${lang}"` : "";
  return `<pre><code${langClass}>${highlighted}</code></pre>`;
};

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
});

// Sanitized markdown render
function renderMarkdown(md) {
  return DOMPurify.sanitize(marked.parse(md));
}

// Theme setup
const hljsStyleEl = document.createElement("style");
document.head.appendChild(hljsStyleEl);

let isDarkTheme = true;
function applyTheme(dark) {
  isDarkTheme = dark;
  document.documentElement.classList.toggle("light", !dark);
  hljsStyleEl.textContent = dark ? hljsDark : hljsLight;
  btnTheme.textContent = dark ? "Light" : "Dark";
  localStorage.setItem("household-md-theme", dark ? "dark" : "light");
}

// State
let currentMode = "edit"; // "edit" or "read"
let currentFilePath = null;
let isDirty = false;

// DOM elements
const reader = document.getElementById("reader");
const readerContent = document.getElementById("reader-content");
const editor = document.getElementById("editor");
const textarea = document.getElementById("editor-textarea");
const previewContent = document.getElementById("preview-content");
const btnToggle = document.getElementById("btn-toggle");
const btnTheme = document.getElementById("btn-theme");
const editToolbar = document.getElementById("edit-toolbar");
const filename = document.getElementById("filename");

// Apply saved theme preference
const savedTheme = localStorage.getItem("household-md-theme");
applyTheme(savedTheme ? savedTheme === "dark" : true);

// Initialize
// File watching
let isReloading = false;

async function startWatching(path) {
  await invoke("unwatch_file");
  await invoke("watch_file", { path });
}

const changeDot = document.getElementById("change-dot");

function flashChangeDot() {
  changeDot.classList.add("visible");
  // After a brief moment, remove the class so the CSS transition fades it out
  setTimeout(() => { changeDot.classList.remove("visible"); }, 100);
}

listen("file-changed", async () => {
  if (!currentFilePath || isReloading || isDirty) return;
  isReloading = true;
  try {
    const content = await invoke("read_file", { path: currentFilePath });
    textarea.value = content;
    if (currentMode === "read") {
      readerContent.innerHTML = renderMarkdown(content);
    } else {
      updatePreview();
    }
    flashChangeDot();
  } catch (_) {}
  setTimeout(() => { isReloading = false; }, 300);
});

async function init() {
  const openedFile = await invoke("get_opened_file");

  if (openedFile) {
    currentFilePath = openedFile;
    const content = await invoke("read_file", { path: openedFile });
    textarea.value = content;
    setMode("read");
    updateTitle();
    startWatching(openedFile);
  } else {
    setMode("edit");
  }
}

function setMode(mode) {
  currentMode = mode;

  if (mode === "read") {
    readerContent.innerHTML = renderMarkdown(textarea.value);
    reader.classList.remove("hidden");
    editor.classList.add("hidden");
    editToolbar.classList.add("hidden");
    btnToggle.textContent = "Edit";
  } else {
    reader.classList.add("hidden");
    editor.classList.remove("hidden");
    editToolbar.classList.remove("hidden");
    updatePreview();
    textarea.focus();
    btnToggle.textContent = "Read";
  }
}

function updateTitle() {
  if (currentFilePath) {
    const name = currentFilePath.split(/[/\\]/).pop();
    filename.textContent = (isDirty ? "\u25cf " : "") + name;
    document.title = name + " \u2014 Household MD";
  } else {
    filename.textContent = (isDirty ? "\u25cf " : "") + "Untitled";
    document.title = "Household MD";
  }
}

async function saveFile() {
  if (!currentFilePath) {
    const path = await save({
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      defaultPath: "untitled.md",
    });
    if (!path) return;
    currentFilePath = path;
  }

  await invoke("write_file", {
    path: currentFilePath,
    content: textarea.value,
  });

  isDirty = false;
  updateTitle();
}

async function openFile() {
  const path = await open({
    filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
    multiple: false,
  });
  if (!path) return;

  currentFilePath = path;
  const content = await invoke("read_file", { path });
  textarea.value = content;
  isDirty = false;
  setMode("read");
  updateTitle();
  startWatching(path);
}

// --- Save As ---
async function saveFileAs() {
  const path = await save({
    filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
    defaultPath: currentFilePath || "untitled.md",
  });
  if (!path) return;
  currentFilePath = path;
  await invoke("write_file", { path, content: textarea.value });
  isDirty = false;
  updateTitle();
}

// --- New File ---
function newFile() {
  currentFilePath = null;
  textarea.value = "";
  isDirty = false;
  updateTitle();
  setMode("edit");
}

// --- Markdown insertion helpers ---
function insertMd(before, after = "", placeholder = "") {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);
  const text = selected || placeholder;
  const replacement = before + text + after;

  textarea.value =
    textarea.value.substring(0, start) + replacement + textarea.value.substring(end);

  // Select the inserted text (not the markers)
  textarea.selectionStart = start + before.length;
  textarea.selectionEnd = start + before.length + text.length;
  textarea.focus();

  isDirty = true;
  updateTitle();
  updatePreview();
}

function insertLinePrefix(prefix) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;

  // Find the start of the first selected line
  const lineStart = val.lastIndexOf("\n", start - 1) + 1;
  // Get the selected block of lines
  const block = val.substring(lineStart, end);
  // Prefix each line
  const prefixed = block.split("\n").map((line) => prefix + line).join("\n");

  textarea.value = val.substring(0, lineStart) + prefixed + val.substring(end);
  textarea.selectionStart = lineStart;
  textarea.selectionEnd = lineStart + prefixed.length;
  textarea.focus();
  isDirty = true;
  updateTitle();
  updatePreview();
}

const mdActions = {
  h1: () => insertLinePrefix("# "),
  h2: () => insertLinePrefix("## "),
  h3: () => insertLinePrefix("### "),
  bold: () => insertMd("**", "**", "bold text"),
  italic: () => insertMd("*", "*", "italic text"),
  strikethrough: () => insertMd("~~", "~~", "text"),
  code: () => insertMd("`", "`", "code"),
  codeblock: () => insertMd("```\n", "\n```", "code here"),
  quote: () => insertLinePrefix("> "),
  ul: () => insertLinePrefix("- "),
  ol: () => insertLinePrefix("1. "),
  task: () => insertLinePrefix("- [ ] "),
  link: () => insertMd("[", "](url)", "link text"),
  image: () => insertMd("![", "](url)", "alt text"),
  table: () => insertMd("| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| ", " | | |\n", "cell"),
  hr: () => insertMd("\n---\n", "", ""),
};

// --- Event listeners ---
btnToggle.addEventListener("click", () => {
  setMode(currentMode === "read" ? "edit" : "read");
});

btnTheme.addEventListener("click", () => {
  applyTheme(!isDarkTheme);
  if (currentMode === "read") readerContent.innerHTML = renderMarkdown(textarea.value);
  else updatePreview();
});

// Window controls
const appWindow = getCurrentWindow();
document.getElementById("btn-minimize").addEventListener("click", () => appWindow.minimize());
document.getElementById("btn-maximize").addEventListener("click", async () => {
  (await appWindow.isMaximized()) ? appWindow.unmaximize() : appWindow.maximize();
});
document.getElementById("btn-close").addEventListener("click", async () => {
  if (isDirty) {
    const shouldClose = window.confirm("You have unsaved changes. Close anyway?");
    if (!shouldClose) return;
  }
  appWindow.close();
});

// Window dragging — use Tauri's startDragging API for cross-platform support
// This works reliably on macOS where -webkit-app-region: drag can fail
document.getElementById("toolbar").addEventListener("mousedown", (e) => {
  // Only drag on the toolbar itself, not on buttons or interactive elements
  if (e.target.closest("button, input, select, a, #toolbar-actions")) return;
  if (e.buttons === 1) {
    appWindow.startDragging();
  }
});

function updatePreview() {
  previewContent.innerHTML = renderMarkdown(textarea.value);
}

let previewTimer = null;
function schedulePreview() {
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 150);
}

textarea.addEventListener("input", () => {
  isDirty = true;
  updateTitle();
  schedulePreview();
});

// File action buttons
document.querySelectorAll("#file-actions button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    if (action === "new") newFile();
    else if (action === "open") openFile();
    else if (action === "save") saveFile();
    else if (action === "save-as") saveFileAs();
  });
});

// Markdown action buttons
document.querySelectorAll("#md-actions button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.md;
    if (action && mdActions[action]) mdActions[action]();
  });
});

// Handle tab key in editor
textarea.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value =
      textarea.value.substring(0, start) + "  " + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + 2;
    isDirty = true;
    updateTitle();
  }
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  const ctrl = e.ctrlKey || e.metaKey;

  if (ctrl && e.key === "s" && e.shiftKey) {
    e.preventDefault();
    saveFileAs();
  } else if (ctrl && e.key === "s") {
    e.preventDefault();
    saveFile();
  } else if (ctrl && e.key === "o") {
    e.preventDefault();
    openFile();
  } else if (ctrl && e.key === "n") {
    e.preventDefault();
    newFile();
  } else if (ctrl && e.key === "e") {
    e.preventDefault();
    setMode(currentMode === "read" ? "edit" : "read");
  } else if (ctrl && e.key === "b" && currentMode === "edit") {
    e.preventDefault();
    mdActions.bold();
  } else if (ctrl && e.key === "i" && currentMode === "edit") {
    e.preventDefault();
    mdActions.italic();
  } else if (e.key === "Escape" && currentMode === "edit" && textarea.value.trim()) {
    setMode("read");
  }
});

init();
