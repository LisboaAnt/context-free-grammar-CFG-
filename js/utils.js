/**
 * Funções utilitárias para o sistema CFG Developer
 */

/**
 * Utility functions for text fields
 */
function getCaretPosition(textField) {
  var pos = 0;
  if (document.selection) {
    textField.focus();
    var sel = document.selection.createRange();
    sel.moveStart('character', -textField.value.length);
    pos = sel.text.length;
  } else if (typeof textField.selectionStart === 'number') {
    pos = textField.selectionStart;
  }
  return pos;
}

function setCaretPosition(textField, index) {
  if (index > textField.value.length) {
    index = textField.value.length;
  }
  textField.selectionStart = index;
  textField.selectionEnd = index;
}

function startFocus(textField) {
  window.setTimeout(function() { textField.focus(); }, 50);
}

function startTest() {
  window.setTimeout(function() { testCFG(); }, 50);
}

/**
 * Função utilitária para escapar HTML
 */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Limpar cache de análise
function clearCache() {
  if (parserCache) {
    parserCache.results.clear();
  }
}

// Cache global para armazenar as regras processadas
let cachedRules = null;
let lastGrammarText = '';

// Cache do parser
let parserCache = {
  analyzer: null,
  results: new Map(),
  lastProcessedGrammar: null
};

// Regras específicas para acelerar o parser
const TOKEN_PATTERNS = {
  'INT': /^[0-9]+$/,
  'FLOAT': /^[0-9]+\.[0-9]+$/,
  'ID': /^[a-zA-Z][a-zA-Z0-9_]*$/,
  'STRING': /^"[^"]*"$|^'[^']*'$/,
  'CARACTERE': /^[a-zA-Z0-9_]$/,
  'DIGITO': /^[0-9]$/,
  'LETRA': /^[a-zA-Z]$/
}; 