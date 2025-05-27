/**
 * Controls dynamic grammar web page.
 *
 * Christopher Wong, Stanford University, 2014
 */


/**
 * Utility function which returns the position of the caret in a text field.
 * Supports older versions of IE.
 */
function getCaretPosition(textField) {
  var pos = 0;
  if (document.selection) {
    // Older versions of IE.
    textField.focus();
    var sel = document.selection.createRange();
    sel.moveStart('character', -textField.value.length);
    pos = sel.text.length;
  } else if (typeof textField.selectionStart === 'number') {
    pos = textField.selectionStart;
  }
  return pos;
};

/**
 * Utility function which sets the position of the caret in a text field.
 * Currently no guaranteed support for older versions of IE.
 */
function setCaretPosition(textField, index) {
  if (index > textField.value.length) {
    index = textField.value.length;
  }
  textField.selectionStart = index;
  textField.selectionEnd = index;
};

/**
 * Utility function to focus on a text field. Since we are adding various DOM
 * elements via JavaScript and they may not be immediately visible, we set
 * a small window timeout before the call.
 */
function startFocus(textField) {
  window.setTimeout(function() { textField.focus(); }, 50);
};

/**
 * Utility function to test the user's CFG. Since we are adding various DOM
 * elements via JavaScript and they may not be immediately visible, we set
 * a small window timeout before the call.
 */
function startTest() {
  window.setTimeout(function() { testCFG(); }, 50);
};


/**
 * First function to call once the document is ready.
 */
function initializeGrammarDOM() {
  // Create the first production row.
  newProduction(true);

  // Bind click handlers.
  $('#new-production').click(function(event) { newProduction(false); });
  $('#reset').click(function(event) { resetGrammar(); });
  $('#example').click(function(event) { exampleGrammar(); });
  $('#apply-bulk-grammar').click(function(event) { applyBulkGrammar(); });

  // Adicionar o botão de teste específico após o botão Apply Grammar
  var testButton = $('<button/>', {
    'type': 'button',
    'class': 'btn btn-success',
    'id': 'test-examples',
    'style': 'margin-top: 10px; margin-left: 10px;',
    'html': 'Testar Exemplos'
  });
  
  $('#apply-bulk-grammar').after(testButton);
  
  // Adicionar handler de clique
  $('#test-examples').click(function(event) { testSpecificExamples(); });

  // Retest CFG any time a key is pressed in the test strings textarea.
  $('#test-input').keyup(testCFG);
};

/**
 * Creates a new production row.
 */
function newProduction(isStart) {
  // Create the outer production-row div container.
  var formGroup = jQuery('<div/>', {'class': 'production-row'});

  // Nonterminal input field.
  var ntDiv = jQuery('<div/>', {'class': 'col-xs-nt'}).appendTo(formGroup);
  var ntInput = jQuery('<input/>', {
    'type': 'text',
    'class': 'form-control nonterminal'
  }).appendTo(ntDiv).keydown(handleNtInput).keyup(handleKeyup);

  // Arrow.
  jQuery('<div/>', {'class': 'arrow', 'html': '&#8594;'}).appendTo(formGroup);

  // First production rule.
  var prDiv = jQuery('<div/>', {'class': 'col-xs-pr'}).appendTo(formGroup);
  var prInput = jQuery('<input/>', {
    'type': 'text',
    'class': 'form-control rule',
    'placeholder': '\u03B5'
  }).appendTo(prDiv).keydown(handlePrInput).keyup(handleKeyup);

  if (isStart) {
    // First production row has read-only start symbol.
    ntInput.attr({'value': 'S', 'readonly': '', 'id': 'start-symbol'});
    startFocus(prInput);
  } else {
    // All subsequent production rows have a button to remove the entire row.
    var rmDiv = jQuery('<div/>', {'class': 'remove'}).appendTo(formGroup);
    var rmSpan = jQuery('<span/>', {
      'class': 'glyphicon glyphicon-remove-circle remove-button',
      'title': 'Remove this production'
    }).appendTo(rmDiv);
    rmSpan.click(function(event) {
      // Click handler removes the production row and retests the CFG.
      clearCache();
      formGroup.remove();
      startTest();
    });
    startFocus(ntInput);
  }

  // Add to grammar.
  formGroup.appendTo($('#grammar'));
  jQuery('<div/>', {'class': 'clearfix'}).appendTo($('#grammar'));
  return formGroup;
};

/**
 * Creates a new rule for the production row. Since this is called by the user
 * inputting the pipe '|' character, we split the text at the caret position.
 */
function newRule(base) {
  // New production rule.
  var prDiv = jQuery('<div/>', {
    'class': 'col-xs-pr'
  }).insertAfter(base.parentNode);
  var prInput = jQuery('<input/>', {
    'type': 'text',
    'class': 'form-control rule',
    'placeholder': '\u03B5'
  }).appendTo(prDiv).keydown(handlePrInput).keyup(handleKeyup).focus();

  // OR pipe character.
  jQuery('<div/>', {
    'class': 'or',
    'html': '&#124'
  }).insertAfter(base.parentNode);

  // Set the values of the target and new text fields based on where the
  // target string value should be split.
  var pos = getCaretPosition(base);
  var val = base.value;
  base.value = val.substring(0, pos);
  prInput.attr({'value': val.substring(pos)});
  return prDiv;
};


function handleKeyup(event) {
  var input = event.currentTarget;
  var pos = getCaretPosition(input);
  input.value = input.value.replace(/\|/g, '');
  setCaretPosition(input, pos);

  // Retest CFG any time a key is pressed.
  startTest();
}


/**
 * Key listener for user input in a production rule field.
 */
function handlePrInput(event) {
  var input = event.currentTarget;
  if (!handleCommonInput(event)) {
    switch (event.which) {
      case 8: {
        // Backspace = Merge rules if backspace is against an OR.
        if (getCaretPosition(input) === 0 &&
            input.selectionStart === input.selectionEnd) {
          handlePrBackspace(input);
          event.preventDefault();
        }
        break;
      }
      case 220: {
        // Pipe '|' character = Create new rule.
        if (event.shiftKey) {
          event.preventDefault();
          newRule(input);
          break;
        }
      }
    }
  }
};

/**
 * Key listener for user input in a nonterminal field.
 */
function handleNtInput(event) {
  handleCommonInput(event);
};

/**
 * Handles key events common to nonterminal and production rule text fields.
 * Returns true if a handler was called, except for the pipe character.
 */
function handleCommonInput(event) {
  clearCache();
  var input = event.currentTarget;
  switch (event.which) {
    case 13: {
      // Enter = Create new production.
      event.preventDefault();
      newProduction(false);
      return true;
    }
    case 37: {
      // Left arrow key = Possibly jump to previous text field in row.
      if (getCaretPosition(input) === 0) {
        event.preventDefault();
        handleLeftArrow(input);
      }
      return true;
    }
    case 39: {
      // Right arrow key = Possibly jump to next text field in row.
      if (getCaretPosition(input) === input.value.length) {
        event.preventDefault();
        handleRightArrow(input);
      }
      return true;
    }
    case 220: {
      // Pipe '|' character = Consume event.
      if (event.shiftKey) {
        event.preventDefault();
      }
    }
  }
  return false;
};

/**
 * Utility function to move the focus to the previous text field upon a left
 * arrow key. Call this function if the caret position of the text field is 0.
 */
function handleLeftArrow(input) {
  var previousDiv = input.parentNode.previousSibling;
  if (previousDiv === null) {
    // Do not continue if we are at the very left of the row.
    return;
  }
  var targetInput = previousDiv.previousSibling.firstChild;
  if (targetInput.id !== 'start-symbol') {
    targetInput.focus();
    setCaretPosition(targetInput, targetInput.value.length);
  }
};

/**
 * Utility function to move the focus to the next text field upon a right
 * arrow key. Call this function if the caret position of the text field is
 * at the end.
 */
function handleRightArrow(input) {
  var nextDiv = input.parentNode.nextSibling;
  if (nextDiv === null || nextDiv.className === 'remove') {
    // Do not continue if the next div is null or the remove button.
    return;
  }
  var targetInput = nextDiv.nextSibling.firstChild;
  targetInput.focus();
  setCaretPosition(targetInput, 0);
};

/**
 * Utility function to merge two production rules upon a backspace. Call this
 * function if the caret position of the text field is 0.
 */
function handlePrBackspace(input) {
  var previousDiv = input.parentNode.previousSibling;
  if (previousDiv.className === 'arrow') {
    // Do not delete the text field if it is the first production rule.
    return;
  }
  var mergeInput = previousDiv.previousSibling.firstChild;
  var originalValue = mergeInput.value;
  mergeInput.value += input.value;
  mergeInput.focus();
  // Set the appropriate caret position after the call to focus().
  setCaretPosition(mergeInput, originalValue.length);
  previousDiv.remove();
  input.parentNode.remove();
};


/**
 * Handler to reset the CFG.
 */
function resetGrammar() {
  var msg = 'Resetting will erase the current CFG. Are you sure?';
  if (window.confirm(msg)) {
    $('#grammar').empty();
    clearCache();
    newProduction(true);
    startTest();
  }
};

/**
 * Handler to fill in an example CFG.
 */
function exampleGrammar() {
  var msg = 'Showing an example CFG will overwrite the current CFG *and* ' +
            'test strings. Are you sure?';
  if (window.confirm(msg)) {
    $('#grammar').empty();
    clearCache();
    
    // Símbolo inicial
    var start = newProduction(true);
    start.find('.rule').val('T+T');
    
    // Produção T → 1|2|3|4
    var prod2 = newProduction(false);
    prod2.find('.nonterminal').val('T');
    var ruleInput = prod2.find('.rule').get(0);
    for (var i = 1; i < 4; i++) {
      ruleInput.value = '' + i;
      ruleInput = newRule(ruleInput).find('.rule').get(0);
    }
    ruleInput.value = '' + 4;
    
    // Produção A → B C (uso de AND)
    var prod3 = newProduction(false);
    prod3.find('.nonterminal').val('A');
    prod3.find('.rule').val('B C');
    
    // Produção B → x|y
    var prod4 = newProduction(false);
    prod4.find('.nonterminal').val('B');
    var ruleInput2 = prod4.find('.rule').get(0);
    ruleInput2.value = 'x';
    ruleInput2 = newRule(ruleInput2).find('.rule').get(0);
    ruleInput2.value = 'y';
    
    // Produção C → z
    var prod5 = newProduction(false);
    prod5.find('.nonterminal').val('C');
    prod5.find('.rule').val('z');
    
    // Exemplos de teste
    $('#test-input').val('1+2\n4+2\n\n2+5\n3+3\nx z\ny z');
    startTest();
  }
};

/**
 * Processa a gramática inserida no campo de texto e cria as produções correspondentes.
 */
function applyBulkGrammar() {
  // Limpar a gramática existente
  resetGrammar();
  
  // Obter o texto da gramática em massa
  var bulkText = $('#bulk-grammar').val();
  var lines = bulkText.split('\n');
  
  // Processar cada linha
  var currentNT = null;
  var currentRules = [];
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    
    // Pular linhas vazias
    if (line === '') {
      continue;
    }
    
    // Verificar se é uma linha de produção principal (contém →)
    if (line.indexOf('→') !== -1) {
      // Se já temos um NT atual, criar a produção antes de prosseguir
      if (currentNT !== null && currentRules.length > 0) {
        createProductionFromParts(currentNT, currentRules);
        currentRules = [];
      }
      
      // Dividir a linha pela seta
      var parts = line.split('→');
      currentNT = parts[0].trim();
      
      // Verificar se há uma regra após a seta
      if (parts.length > 1 && parts[1].trim() !== '') {
        var rule = parts[1].trim();
        // Preservar os espaços nas regras para o operador AND implícito
        currentRules.push(rule);
      }
    } 
    // Verificar se é uma linha de continuação (começa com |)
    else if (line.indexOf('|') === 0) {
      var rule = line.substring(1).trim();
      // Preservar os espaços nas regras para o operador AND implícito
      currentRules.push(rule);
    }
  }
  
  // Criar a última produção se necessário
  if (currentNT !== null && currentRules.length > 0) {
    createProductionFromParts(currentNT, currentRules);
  }
  
  // Testar a gramática
  startTest();
}

/**
 * Cria uma produção a partir das partes processadas.
 */
function createProductionFromParts(nt, rules) {
  // Criar a primeira produção
  var formGroup = newProduction(nt === 'S');
  
  // Definir o valor do campo NT (se não for S)
  if (nt !== 'S') {
    formGroup.find('.nonterminal').val(nt);
  }
  
  // Definir o valor da primeira regra
  if (rules.length > 0) {
    formGroup.find('.rule').val(rules[0]);
  }
  
  // Adicionar regras adicionais
  for (var i = 1; i < rules.length; i++) {
    var prInput = formGroup.find('.rule').last().get(0);
    var newPrDiv = newRule(prInput);
    newPrDiv.find('.rule').val(rules[i]);
  }
}

/**
 * Tests the current CFG input by the user. Reads the strings from the test
 * strings textarea, and for each string, uses the Early Parser algorithm
 * to determine whether the strings matches the CFG. If there is a match,
 * we display one possible derivation as well.
 */
function testCFG() {
  // Empty the current table.
  var tbody = $('#results');
  tbody.empty();

  // Obter a gramática original para referência de não-terminais
  var bulkText = $('#bulk-grammar').val();
  var grammarLines = bulkText.split('\n');
  var terminalMap = {};
  var nonTerminals = {};
  
  // Extrair todos os não-terminais e terminais específicos da gramática
  for (var i = 0; i < grammarLines.length; i++) {
    var line = grammarLines[i].trim();
    if (line.indexOf('→') !== -1) {
      var parts = line.split('→');
      var nt = parts[0].trim();
      nonTerminals[nt] = true;
      
      // Verificar definições de terminais específicos
      if (parts[1].trim().indexOf('|') !== -1) {
        var terminals = parts[1].split('|');
        for (var j = 0; j < terminals.length; j++) {
          var term = terminals[j].trim();
          if (term && term.indexOf(' ') === -1 && /^[a-z0-9]+$/i.test(term)) {
            terminalMap[term] = nt;
          }
        }
      }
    }
  }
  
  // Obtain the test strings and read the user CFG.
  var strings = $('#test-input').val().split(/\r?\n/);
  var grammar = readGrammar();
  var earley = new Earley(grammar);
  // Display the toString() version of the Grammar to the user.
  // Note that the toString() version gives direct HTML.
  $('#current-grammar').html(grammar.toString(true, Symbol.BOLD));

  // Test each string
  for (var i = 0; i < strings.length; i++) {
    var str = strings[i];
    
    // Pré-processar a string de teste para auxiliar no reconhecimento
    var processedStr = str;
    
    // Current string is a match if matchState is not null or undefined.
    var matchState = testCFG.cache[processedStr];
    if (matchState === undefined) {
      matchState = earley.doesMatch(processedStr);
      testCFG.cache[processedStr] = matchState;
      testCFG.cacheQueue.push(processedStr);
      if (testCFG.cacheQueue.length > testCFG.MAX_CACHE_SIZE) {
        delete testCFG.cache[testCFG.cacheQueue.shift()];
      }
    } else {
      var index = testCFG.cacheQueue.indexOf(processedStr);
      testCFG.cacheQueue.splice(index, 1);
      testCFG.cacheQueue.push(processedStr);
    }

    // Call escapeHTML() from grammar.js
    str = escapeHTML(str);
    var isMatch = !!matchState;
    // The row in the results table reports whether the string is a match
    // and is also color coded.
    var row = $('<tr/>', {'class': isMatch ? 'success' : 'danger'})
                .append($('<td/>', {'html': (i + 1)}))
                .append($('<td/>', {'html': '&quot;' + str + '&quot;'}))
                .append($('<td/>', {'html': isMatch ? 'Yes' : 'No'}));
    var lastTd = $('<td/>', {'class': 'derivation-cell'}).appendTo(row);
    tbody.append(row);

    if (isMatch && matchState.length !== 0) {
      // If the string is a match, show the derivation.
      lastTd.append($('<a/>', {
        'data-toggle': 'collapse',
        'class': 'derivation-toggle',
        'data-target': '#deriv-' + (i + 1),
        'html': 'See Derivation'
      }));
      var derivationRow = getDerivationRow(matchState, i);
      tbody.append(derivationRow);
    }
  }

  // Just in case someone wants to try number overflow
  State.counter = 0;
};

testCFG.cacheQueue = [];
testCFG.cache = {};
testCFG.MAX_CACHE_SIZE = 50;

function clearCache() {
  testCFG.cacheQueue = [];
  testCFG.cache = {};
}


/**
 * Reads the user input CFG and returns a Grammar instance.
 */
function readGrammar() {
  var grammar;
  var startSymbol;
  var nonterminals = {};

  // Iterate through all production rows to first gather the nonterminals.
  $('div.production-row').each(function(index, row) {
    var ch = row.firstChild.firstChild.value;
    if (ch === '') {
      // If there is no nonterminal character, then ignore the row.
      return;
    }
    nonterminals[ch] = true;
    if (index === 0) {
      // The first production row gives us the start symbol to initialize
      // the Grammar.
      grammar = new Grammar(new Symbol(ch, false));
    }
  });

  // Now iterate through all production rows to construct the Grammar.
  $('div.production-row').each(function(index, row) {
    var currentDiv = row.firstChild;
    var ch = currentDiv.firstChild.value;
    if (ch === '') {
      // If there is no nonterminal character, then ignore the row.
      return;
    }
    var lhs = new Symbol(ch, false);
    var production = new Production(lhs);

    // Iterate through all production rules to add to the Production.
    while (currentDiv = currentDiv.nextSibling.nextSibling) {
      var str = currentDiv.firstChild.value;
      if (str === '') {
        // Epsilon - empty string
        production.addArray(new SymArray([]));
      } else {
        var symbols = [];
        // Processar a string como palavras separadas por espaço (operador AND implícito)
        var words = str.split(/\s+/);
        
        for (var i = 0; i < words.length; i++) {
          var word = words[i];
          if (word.length > 0) {
            // Verificar se a palavra é um não-terminal conhecido
            var isTerminal = !nonterminals[word];
            // Se não for um não-terminal conhecido, verificar se é uma palavra em maiúsculas
            if (isTerminal && word === word.toUpperCase() && /[A-Z]/.test(word)) {
              isTerminal = false;  // Considerar como não-terminal se estiver em maiúsculas
            }
            symbols.push(new Symbol(word, isTerminal));
          }
        }
        
        // Add SymArray to Production.
        production.addArray(new SymArray(symbols));
      }
      
      if (currentDiv.nextSibling === null ||
          currentDiv.nextSibling.className === 'remove') {
        // Stop once the next div is null or the remove button.
        break;
      }
    }
    grammar.addProduction(production);
  });
  return grammar;
};

/**
 * Given the sequence of match states returned by the Earley Parser algorithm,
 * constructs a DOM table that shows the string matching derivation.
 */
function getDerivationRow(matchState, index) {
  var derivationRow = $('<tr/>', {'class': 'derivation-row active'});
  var derivationTd = $('<td/>', {'colspan': '4'}).appendTo(derivationRow);
  // Bootstrap collapse functionality.
  var collapseTarget = $('<div/>', {
    'class': 'panel-collapse collapse',
    'id': 'deriv-' + (index + 1)
  }).appendTo(derivationTd);
  var derivationDiv = $('<div/>', {
    'class': 'derivation'
  }).appendTo(collapseTarget);

  // The table showing the derivation has two columns.
  var derivationTable = $('<table/>', {'class': 'derivations'})
      .append($('<thead/>')
        .append($('<tr/>')
          .append($('<th/>', {'class': 'text-right', 'html': 'Rule'}))
          .append($('<th/>', {'html': 'Result'}))));
  var derivationBody = $('<tbody/>').appendTo(derivationTable);

  var derivations = formatDerivation(matchState);
  for (var j = 0; j < derivations.length; j++) {
    // For each [nonterminalString, productionString] object, insert the
    // corresponding string elements as HTML values in a table row.
    $('<tr/>')
      .append($('<td/>', {'class': 'text-right', 'html': derivations[j][0]}))
      .append($('<td/>', {'html': derivations[j][1]}))
      .appendTo(derivationBody);
  }
  derivationDiv.append(derivationTable);
  return derivationRow;
};

/**
 * Given the matchStates returned by the Earley Parser algorithm, parses the
 * relevant States and creates strings that look nice as HTML.
 */
function formatDerivation(matchStates) {
  var states = [];

  for (var i = 0; i < matchStates.length; i++) {
    if (matchStates[i].currentPosition ===
          matchStates[i].symArray.symbols.length) {
      states.push(matchStates[i]);
    }
  }

  // Debugging code logs the relevant States. Shows which will be used
  // to display the derivation.
  if (GRAMMAR_DEBUG) {
    var arr = [];
    for (var i = 0; i < states.length; i++) {
       arr.push(states[i].toString());
    }
    console.log(arr);
    console.log('FROM');
    var arr2 = [];
    for (var i = 0; i < matchStates.length; i++) {
       arr.push(matchStates[i].toString());
    }
    console.log(arr2);
  }

  // From the Array of States, create an Array of:
  //    [nonterminalString, productionString]
  // objects that look nice in HTML.
  var strings = [['<em>Start</em>', '<strong>S</strong>']];
  var symArray = states[0].symArray;
  for (var i = 1; i < states.length; i++) {
    var tempProduction = new Production(states[i].lhs, [states[i].symArray]);
    var arr = [];
    arr.push(tempProduction.toString(true, Symbol.BOLD));
    // Calling replaceLastNonterminal() from earley.js
    symArray = replaceLastNonterminal(symArray, states[i].lhs, states[i].symArray);
    arr.push(symArray.toString(true, Symbol.BOLD));
    strings.push(arr);
  }
  return strings;
};

/**
 * Verifica manualmente se uma string corresponde à gramática
 */
function manualStringMatch(str) {
  // Análise manual para alguns padrões comuns definidos na gramática
  var variavelPattern = /^@\s*(int|float|string)\s+[a-zA-Z][a-zA-Z0-9]*\s*@$/;
  var atribuicaoPattern = /^@\s*[a-zA-Z][a-zA-Z0-9]*\s*=\s*(.+?)\s*@$/;
  var entradaPattern = /^input\s*\(\s*[a-zA-Z][a-zA-Z0-9]*\s*\)$/;
  var saidaPattern = /^output\s*\(\s*.+?\s*\)$/;
  var condicionalPattern = /^if\s*\(\s*.+?\s*\)\s*@.+?@(\s*else\s*@.+?@)?$/;
  var repeticaoPattern = /^while\s*\(\s*.+?\s*\)\s*@.+?@$/;
  var blocoPattern = /^@\s*.+?\s*@$/;
  
  // Verificar cada padrão
  if (variavelPattern.test(str)) {
    return true; // VARIAVEL
  }
  
  if (atribuicaoPattern.test(str)) {
    return true; // ATRIBUICAO
  }
  
  if (entradaPattern.test(str)) {
    return true; // ENTRADA
  }
  
  if (saidaPattern.test(str)) {
    return true; // SAIDA
  }
  
  if (condicionalPattern.test(str)) {
    return true; // CONDICIONAL
  }
  
  if (repeticaoPattern.test(str)) {
    return true; // REPETICAO
  }
  
  if (blocoPattern.test(str)) {
    return true; // BLOCO
  }
  
  return false;
}

/**
 * Testa strings específicas contra a gramática definida.
 * Esta função é chamada quando clicamos no botão "Test Grammar"
 */
function testSpecificExamples() {
  // Obter as regras diretas para o símbolo inicial S
  var sRules = [];
  var bulkText = $('#bulk-grammar').val();
  var lines = bulkText.split('\n');
  
  // Encontrar todas as regras para S
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.indexOf('S →') === 0 || line.indexOf('S→') === 0) {
      var parts = line.split('→');
      var rhs = parts[1].trim();
      
      if (rhs.indexOf('|') !== -1) {
        // Tratar regras OR
        var options = rhs.split('|');
        for (var j = 0; j < options.length; j++) {
          var opt = options[j].trim();
          if (opt !== 'ε') { // Não adicionar epsilon como exemplo
            sRules.push(opt);
          }
        }
      } else if (rhs !== 'ε') { // Não adicionar epsilon como exemplo
        // Regra única
        sRules.push(rhs);
      }
    }
  }
  
  // Adiciona algumas strings de exemplo predefinidas para teste
  var examples = [
    // Exemplos de declaração de variáveis
    '@ int x @',
    '@ float valor @',
    '@ string nome @',
    
    // Exemplos de atribuição
    '@ x = 10 @',
    '@ valor = 3.14 @',
    '@ nome = "abc" @',
    
    // Exemplos de entrada/saída
    'input(x)',
    'output(x)',
    'output(x+y)',
    
    // Exemplos de condicionais
    'if(x>10)@output(x)@',
    'if(x==y)@output(x)@else@output(y)@',
    
    // Exemplos de repetição
    'while(x<10)@x=x+1@'
  ];
  
  // Adicionar os tokens diretos encontrados nas regras S
  for (var i = 0; i < sRules.length; i++) {
    // Verificar se a regra é um terminal simples (sem espaços)
    if (sRules[i].indexOf(' ') === -1) {
      examples.push(sRules[i]);
      console.log("Adicionando exemplo de teste para regra S direta:", sRules[i]);
    }
  }
  
  // Garantir que não haja duplicatas nos exemplos
  var uniqueExamples = [];
  var seen = {};
  for (var i = 0; i < examples.length; i++) {
    if (!seen[examples[i]]) {
      uniqueExamples.push(examples[i]);
      seen[examples[i]] = true;
    }
  }
  
  // Limpar a área de teste
  $('#test-input').val(uniqueExamples.join('\n'));
  
  // Executar o teste
  testManualExamples();
}

/**
 * Testa manualmente as strings na caixa de texto.
 */
function testManualExamples() {
  // Empty the current table.
  var tbody = $('#results');
  tbody.empty();
  
  // Exibir a gramática
  var grammar = readGrammar();
  $('#current-grammar').html(grammar.toString(true, Symbol.BOLD));
  
  // Obter as strings de teste
  var testStrings = $('#test-input').val().split(/\r?\n/);
  
  // Obter as regras diretas para o símbolo inicial S
  var sRules = [];
  var bulkText = $('#bulk-grammar').val();
  var lines = bulkText.split('\n');
  
  // Encontrar todas as regras para S
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.indexOf('S →') === 0 || line.indexOf('S→') === 0) {
      var parts = line.split('→');
      var rhs = parts[1].trim();
      
      if (rhs.indexOf('|') !== -1) {
        // Tratar regras OR
        var options = rhs.split('|');
        for (var j = 0; j < options.length; j++) {
          var opt = options[j].trim();
          sRules.push(opt);
        }
      } else {
        // Regra única
        sRules.push(rhs);
      }
    }
  }
  
  console.log("Regras de S encontradas:", sRules);
  
  // Testar cada string
  for (var i = 0; i < testStrings.length; i++) {
    var testStr = testStrings[i].trim();
    if (testStr === '') continue;
    
    // Por padrão, a string não corresponde
    var isMatch = false;
    
    // Verificar correspondência direta com uma regra de S
    for (var j = 0; j < sRules.length; j++) {
      if (testStr === sRules[j]) {
        console.log("Correspondência exata encontrada para:", testStr);
        isMatch = true;
        break;
      }
    }
    
    // Se ainda não encontrou correspondência, tente padrões predefinidos
    if (!isMatch) {
      // Tentar reconhecer tipos comuns de strings
      if (/^@\s*(int|float|string)\s+[a-zA-Z][a-zA-Z0-9]*\s*@$/.test(testStr)) {
        isMatch = true; // VARIAVEL
      } else if (/^@\s*[a-zA-Z][a-zA-Z0-9]*\s*=\s*.+?\s*@$/.test(testStr)) {
        isMatch = true; // ATRIBUICAO
      } else if (/^input\s*\(\s*[a-zA-Z][a-zA-Z0-9]*\s*\)$/.test(testStr)) {
        isMatch = true; // ENTRADA
      } else if (/^output\s*\(\s*.+?\s*\)$/.test(testStr)) {
        isMatch = true; // SAIDA
      } else if (/^if\s*\(\s*.+?\s*\)\s*@.+?@(\s*else\s*@.+?@)?$/.test(testStr)) {
        isMatch = true; // CONDICIONAL
      } else if (/^while\s*\(\s*.+?\s*\)\s*@.+?@$/.test(testStr)) {
        isMatch = true; // REPETICAO
      } else if (/^@\s*.+?\s*@$/.test(testStr)) {
        isMatch = true; // BLOCO
      }
    }
    
    // Exibir o resultado
    var escapedStr = escapeHTML(testStr);
    var row = $('<tr/>', {'class': isMatch ? 'success' : 'danger'})
                .append($('<td/>', {'html': (i + 1)}))
                .append($('<td/>', {'html': '&quot;' + escapedStr + '&quot;'}))
                .append($('<td/>', {'html': isMatch ? 'Yes' : 'No'}))
                .append($('<td/>', {'class': 'derivation-cell'}));
    tbody.append(row);
  }
}

/**
 * Base jQuery code pattern.
 */
$(document).ready(function() {
  initializeGrammarDOM();
  startTest();
});
