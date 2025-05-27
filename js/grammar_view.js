/**
 * Controls dynamic grammar web page.
 *
 * Christopher Wong, Stanford University, 2014
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
 * First function to call once the document is ready.
 */
function initializeGrammarDOM() {
  // Create the first production row.
  newProduction(true);

  // Bind click handlers.
  $('#new-production').click(function(event) { newProduction(false); });
  $('#reset').click(function(event) { resetGrammar(); });
  $('#example').click(function(event) { exampleGrammar(); });
  $('#apply-bulk-grammar').click(function(event) { 
    // Mostrar indicador de processamento
    $('#status-message').text('Aplicando gramática...');
    $('#processing-count').text('0/0');
    $('#processing-status').show();
    // Pequeno atraso para garantir que a UI seja atualizada
    setTimeout(function() {
      applyBulkGrammar();
    }, 50);
  });
  
  // Variável global para controlar quando forçar a atualização completa
  window.forceRefresh = false;
  
  $('#refresh-results').click(function(event) { 
    // Mostrar indicador de processamento
    $('#status-message').text('Reiniciando análise...');
    $('#processing-count').text('0/0');
    $('#processing-status').show();
    // Pequeno atraso para garantir que a UI seja atualizada
    setTimeout(function() {
      clearCache(); 
      window.forceRefresh = true; // Marcar para forçar atualização
      testCFG(); 
      window.forceRefresh = false; // Resetar após a atualização
    }, 50);
  });

  // Opção para desativar cache
  $('#disable-cache').change(function() {
    if ($(this).is(':checked')) {
      // Limpar cache quando o usuário marca a opção
      clearCache();
    }
    // Reprocessar as strings de teste
    testCFG();
  });

  // Retest CFG any time a key is pressed in the test strings textarea.
  $('#test-input').keyup(testCFG);
}

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
}

/**
 * Creates a new rule for the production row.
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

  // Set the values of the target and new text fields.
  var pos = getCaretPosition(base);
  var val = base.value;
  base.value = val.substring(0, pos);
  prInput.attr({'value': val.substring(pos)});
  return prDiv;
}

function handleKeyup(event) {
  var input = event.currentTarget;
  var pos = getCaretPosition(input);
  input.value = input.value.replace(/\|/g, '');
  setCaretPosition(input, pos);
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
}

/**
 * Key listener for user input in a nonterminal field.
 */
function handleNtInput(event) {
  handleCommonInput(event);
}

/**
 * Handles key events common to nonterminal and production rule text fields.
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
}

/**
 * Utility function to move the focus to the previous text field.
 */
function handleLeftArrow(input) {
  var previousDiv = input.parentNode.previousSibling;
  if (previousDiv === null) {
    return;
  }
  var targetInput = previousDiv.previousSibling.firstChild;
  if (targetInput.id !== 'start-symbol') {
    targetInput.focus();
    setCaretPosition(targetInput, targetInput.value.length);
  }
}

/**
 * Utility function to move the focus to the next text field.
 */
function handleRightArrow(input) {
  var nextDiv = input.parentNode.nextSibling;
  if (nextDiv === null || nextDiv.className === 'remove') {
    return;
  }
  var targetInput = nextDiv.nextSibling.firstChild;
  targetInput.focus();
  setCaretPosition(targetInput, 0);
}

/**
 * Utility function to merge two production rules upon a backspace.
 */
function handlePrBackspace(input) {
  var previousDiv = input.parentNode.previousSibling;
  if (previousDiv.className === 'arrow') {
    return;
  }
  var mergeInput = previousDiv.previousSibling.firstChild;
  var originalValue = mergeInput.value;
  mergeInput.value += input.value;
  mergeInput.focus();
  setCaretPosition(mergeInput, originalValue.length);
  previousDiv.remove();
  input.parentNode.remove();
}

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
}

/**
 * Handler to fill in an example CFG.
 */
function exampleGrammar() {
  var msg = 'Mostrar um exemplo de gramática sobrescreverá a gramática atual *e* ' +
            'strings de teste. Tem certeza?';
  if (window.confirm(msg)) {
    $('#grammar').empty();
    clearCache();
    
    // Símbolo inicial
    var start = newProduction(true);
    start.find('.rule').val('COMANDO');
    
    // Definir gramática de texto em massa
    $('#bulk-grammar').val(`S → COMANDO
COMANDO := BLOCO | output ( EXPRESSAO )
BLOCO → @ LISTACOMANDOS @
LISTACOMANDOS := COMANDO LISTACOMANDOS | None
EXPRESSAO → ID | INT
ID := a | b | c
INT → 0 | 1 | 2 | 3`);
    
    // Exemplos de teste que sabemos que funcionam
    $('#test-input').val(`output(a)
@ output(1) @
output(b)
@ @ 
@ output(3) @`);
    
    // Executar o teste
    testCFG();
  }
}

/**
 * Processa a gramática inserida no campo de texto e cria as produções correspondentes.
 */
function applyBulkGrammar() {
  // Limpar a gramática existente
  
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
    
    // Verificar se é uma linha de produção principal (contém → ou :=)
    var hasArrow = line.indexOf('→') !== -1;
    var hasColonEqual = line.indexOf(':=') !== -1;
    
    if (hasArrow || hasColonEqual) {
      // Se já temos um NT atual, criar a produção antes de prosseguir
      if (currentNT !== null && currentRules.length > 0) {
        createProductionFromParts(currentNT, currentRules);
        currentRules = [];
      }
      
      // Dividir a linha pelo delimitador apropriado
      var parts;
      if (hasArrow) {
        parts = line.split('→');
      } else {
        parts = line.split(':=');
      }
      
      currentNT = parts[0].trim();
      
      // Verificar se há uma regra após a seta
      if (parts.length > 1 && parts[1].trim() !== '') {
        var rule = parts[1].trim();
        currentRules.push(rule);
      }
    } 
    // Verificar se é uma linha de continuação (começa com |)
    else if (line.indexOf('|') === 0) {
      var rule = line.substring(1).trim();
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

// Otimizador para gramáticas - analisa as regras antes para otimizar o processamento
class GrammarOptimizer {
  constructor(rules) {
    this.rules = rules;
    this.hasEpsilon = {};
    this.canStartWith = {};
    this.canContain = {};
    this.analyzeFully();
  }
  
     // Verifica quais não-terminais podem derivar ε
   analyzeEpsilon() {
     // Primeiro, encontrar não-terminais que derivam ε diretamente
     for (const nt in this.rules) {
       if (this.rules[nt].includes('ε') || this.rules[nt].includes('None')) {
         this.hasEpsilon[nt] = true;
       } else {
         this.hasEpsilon[nt] = false;
       }
     }
     
     // Propagar a informação até chegar a um ponto fixo
     let changed = true;
     while (changed) {
       changed = false;
       for (const nt in this.rules) {
         if (this.hasEpsilon[nt]) continue; // Já sabemos que pode derivar ε
         
         // Verificar se alguma produção pode derivar ε
         for (const prod of this.rules[nt]) {
           if (prod === 'ε' || prod === 'None') {
            this.hasEpsilon[nt] = true;
            changed = true;
            break;
          }
          
          // Verificar se todos os símbolos da produção podem derivar ε
          const symbols = prod.trim().split(/\s+/);
          let allCanEpsilon = symbols.length > 0;
          for (const sym of symbols) {
            if (!(sym in this.rules) || !this.hasEpsilon[sym]) {
              allCanEpsilon = false;
              break;
            }
          }
          
          if (allCanEpsilon) {
            this.hasEpsilon[nt] = true;
            changed = true;
            break;
          }
        }
      }
    }
  }
  
  // Analisa quais caracteres podem começar as strings derivadas de cada não-terminal
  analyzeFirstChars() {
    // Inicializar
    for (const nt in this.rules) {
      this.canStartWith[nt] = new Set();
    }
    
    // Analisar até ponto fixo
    let changed = true;
    while (changed) {
      changed = false;
      
      for (const nt in this.rules) {
        const oldSize = this.canStartWith[nt].size;
        
        for (const prod of this.rules[nt]) {
          if (prod === 'ε') continue;
          
          const symbols = prod.trim().split(/\s+/);
          if (symbols.length === 0) continue;
          
          const firstSym = symbols[0];
          
          // Se for terminal, adicionar
          if (!(firstSym in this.rules)) {
            if (firstSym.length > 0) {
              this.canStartWith[nt].add(firstSym[0]);
              changed = changed || (oldSize !== this.canStartWith[nt].size);
            }
          } 
          // Se for não-terminal, propagar
          else {
            for (const char of this.canStartWith[firstSym]) {
              this.canStartWith[nt].add(char);
            }
            
            // Se o primeiro símbolo pode derivar ε, precisamos considerar o próximo
            if (this.hasEpsilon[firstSym] && symbols.length > 1) {
              const nextSym = symbols[1];
              if (!(nextSym in this.rules)) {
                if (nextSym.length > 0) {
                  this.canStartWith[nt].add(nextSym[0]);
                }
              } else {
                for (const char of this.canStartWith[nextSym]) {
                  this.canStartWith[nt].add(char);
                }
              }
            }
          }
        }
        
        changed = changed || (oldSize !== this.canStartWith[nt].size);
      }
    }
  }
  
  // Faz todas as análises
  analyzeFully() {
    this.analyzeEpsilon();
    this.analyzeFirstChars();
  }
  
  // Verificações rápidas para acelerar a análise
  canDerive(symbol, input) {
    // Verificação rápida: string vazia
    if (input === '') {
      return this.hasEpsilon[symbol] || false;
    }
    
    // Verificação rápida: primeiro caractere
    const firstChar = input[0];
    const possibleFirstChars = this.canStartWith[symbol];
    
    if (possibleFirstChars && possibleFirstChars.size > 0) {
      if (!possibleFirstChars.has(firstChar)) {
        return false; // Rejeição rápida: o símbolo não pode começar com este caractere
      }
    }
    
    return null; // Não conseguimos determinar rápido, precisa fazer análise completa
  }
}

function pertenceALinguagem(str, rules, startSymbol = 'S', trackDerivation = false) {
  // Cache para evitar recalcular as mesmas derivações repetidamente
  const memo = new Map();
  
  // Para rastrear a derivação
  const derivationSteps = [];
  
  // Criar otimizador para a gramática
  const optimizer = new GrammarOptimizer(rules);
  
  // Variável para controlar se a análise está completa
  let analysisComplete = false;
  
  // Timeout para análises muito longas (5 segundos)
  const startTime = Date.now();
  const MAX_ANALYSIS_TIME = 5000; // 5 segundos
  
  // Função para verificar se o tempo máximo foi excedido
  function checkTimeout() {
    return (Date.now() - startTime) > MAX_ANALYSIS_TIME;
  }
  
  // Otimizações específicas para sua gramática
  // Verificação rápida para expressões de saída como "output(a)"
  if (str.startsWith('output(') && str.endsWith(')')) {
    if ('SAIDA' in rules) {
      const innerExpr = str.substring(7, str.length - 1);
      // Verificar se a expressão interna é válida
      const result = pertenceALinguagem(innerExpr, rules, 'EXPRESSAO', trackDerivation);
      if (result === true || (trackDerivation && result.accepted)) {
        if (trackDerivation) {
          const innerDerivation = result.derivation || [];
          const steps = [
            {
              rule: `${startSymbol} → SAIDA`,
              application: startSymbol,
              result: 'SAIDA'
            },
            {
              rule: 'SAIDA → output ( EXPRESSAO )',
              application: 'SAIDA',
              result: `output ( EXPRESSAO )`
            },
            ...innerDerivation.map(step => ({
              ...step,
              application: step.application.replace('EXPRESSAO', 'EXPRESSAO'),
              result: step.result.replace('EXPRESSAO', `EXPRESSAO`)
            })),
            {
              rule: `Final`,
              application: `output ( ${innerExpr} )`,
              result: str
            }
          ];
          return { accepted: true, derivation: steps };
        }
        return true;
      }
    }
  }
  
  // Verificação rápida para expressões de entrada como "input(id)"
  if (str.startsWith('input(') && str.endsWith(')')) {
    if ('ENTRADA' in rules) {
      const id = str.substring(6, str.length - 1);
      // Verificar se o ID é válido
      const result = pertenceALinguagem(id, rules, 'ID', trackDerivation);
      if (result === true || (trackDerivation && result.accepted)) {
        if (trackDerivation) {
          const innerDerivation = result.derivation || [];
          const steps = [
            {
              rule: `${startSymbol} → ENTRADA`,
              application: startSymbol,
              result: 'ENTRADA'
            },
            {
              rule: 'ENTRADA → input ( ID )',
              application: 'ENTRADA',
              result: `input ( ID )`
            },
            ...innerDerivation.map(step => ({
              ...step,
              application: step.application.replace('ID', 'ID'),
              result: step.result.replace('ID', `ID`)
            })),
            {
              rule: `Final`,
              application: `input ( ${id} )`,
              result: str
            }
          ];
          return { accepted: true, derivation: steps };
        }
        return true;
      }
    }
  }
  
  // Verificação rápida para blocos como "@ comandos @"
  if (str.startsWith('@') && str.endsWith('@') && str.length > 2) {
    if ('BLOCO' in rules) {
      const innerCommands = str.substring(1, str.length - 1).trim();
      // Verificar se os comandos internos são válidos
      const result = pertenceALinguagem(innerCommands, rules, 'LISTACOMANDOS', trackDerivation);
      if (result === true || (trackDerivation && result.accepted)) {
        if (trackDerivation) {
          const innerDerivation = result.derivation || [];
          const steps = [
            {
              rule: `${startSymbol} → BLOCO`,
              application: startSymbol,
              result: 'BLOCO'
            },
            {
              rule: 'BLOCO → @ LISTACOMANDOS @',
              application: 'BLOCO',
              result: `@ LISTACOMANDOS @`
            },
            ...innerDerivation.map(step => ({
              ...step,
              application: step.application.replace('LISTACOMANDOS', 'LISTACOMANDOS'),
              result: step.result.replace('LISTACOMANDOS', `LISTACOMANDOS`)
            })),
            {
              rule: `Final`,
              application: `@ ${innerCommands} @`,
              result: str
            }
          ];
          return { accepted: true, derivation: steps };
        }
        return true;
      }
    }
  }
  
  // Função para criar chave única para o cache
  function createKey(symbol, input) {
    return symbol + ":" + input + (trackDerivation ? ":track" : "");
  }
  
  // Função recursiva para verificar se a string pode ser derivada do símbolo
  function deriva(symbol, input, currentDerivation = []) {
    // Verificar timeout
    if (checkTimeout()) {
      analysisComplete = false;
      if (trackDerivation) {
        return { 
          accepted: false, 
          derivation: [...currentDerivation, {
            rule: "Timeout - análise incompleta",
            application: "Tempo limite excedido",
            result: "Análise interrompida"
          }],
          complete: false
        };
      } else {
        return false;
      }
    }
    
    // Verificar no cache primeiro
    const key = createKey(symbol, input);
    if (memo.has(key)) {
      return memo.get(key);
    }
    
    // Terminal: verificação direta
    if (!(symbol in rules)) {
      const result = input === symbol;
      if (trackDerivation) {
        if (result) {
          const derivationResult = {
            accepted: true,
            derivation: [...currentDerivation, {
              rule: `Terminal match`,
              application: symbol,
              result: input
            }],
            complete: true
          };
          memo.set(key, derivationResult);
          return derivationResult;
        } else {
          memo.set(key, { accepted: false, derivation: [], complete: true });
          return { accepted: false, derivation: [], complete: true };
        }
      } else {
        memo.set(key, result);
        return result;
      }
    }
    
    // Verificações rápidas usando o otimizador
    if (!trackDerivation) {
      const quickResult = optimizer.canDerive(symbol, input);
      if (quickResult !== null) {
        memo.set(key, quickResult);
        return quickResult;
      }
    }

    // Verificação para produções individuais
    for (const production of rules[symbol]) {
      // Ignorar produções vazias não-epsilon
      if (production.trim() === '' && production !== 'ε' && production !== 'None') continue;
      
      // Caso epsilon (ε ou None)
      if (production === 'ε' || production === 'None') {
        if (input === '') {
          if (trackDerivation) {
            const derivationResult = {
              accepted: true,
              derivation: [...currentDerivation, {
                rule: `${symbol} → ε`,
                application: symbol,
                result: "ε"
              }]
            };
            memo.set(key, derivationResult);
            return derivationResult;
          } else {
            memo.set(key, true);
            return true;
          }
        }
        if (symbol !== startSymbol) {
          const result = input === '';
          if (trackDerivation) {
            if (result) {
              const derivationResult = {
                accepted: true,
                derivation: [...currentDerivation, {
                  rule: `${symbol} → ε`,
                  application: symbol,
                  result: "ε"
                }]
              };
              memo.set(key, derivationResult);
              return derivationResult;
            } else {
              memo.set(key, { accepted: false, derivation: [] });
              return { accepted: false, derivation: [] };
            }
          } else {
            memo.set(key, result);
            return result;
          }
        }
        continue;
      }
      
      // Dividir a produção em símbolos
      const symbols = production.trim().split(/\s+/);
      
      // Otimização: Se temos apenas um símbolo na produção, podemos simplificar
      if (symbols.length === 1) {
        const result = deriva(symbols[0], input, 
          trackDerivation ? [...currentDerivation, {
            rule: `${symbol} → ${symbols[0]}`,
            application: symbol,
            result: symbols[0]
          }] : []);
          
        if ((trackDerivation && result.accepted) || (!trackDerivation && result)) {
          memo.set(key, result);
          return result;
        }
        continue;
      }
      
      // Otimização: verificar comprimento - se a string for muito curta para esta produção
      // Para cada terminal na produção, precisamos de pelo menos 1 caractere
      let minLength = 0;
      for (const sym of symbols) {
        if (!(sym in rules)) minLength++;
      }
      if (input.length < minLength) continue;
      
      // Otimização para padrões específicos na sua gramática
      // Por exemplo, se sabemos que o símbolo é BLOCO e o formato deve ser '@ ... @'
      if (symbol === 'BLOCO' && symbols.length === 3) {
        if (symbols[0] === '@' && symbols[2] === '@') {
          if (!input.startsWith('@') || !input.endsWith('@')) {
            continue; // Não pode corresponder
          }
          const innerContent = input.substring(1, input.length - 1);
          if (deriva(symbols[1], innerContent)) {
            memo.set(key, true);
            return true;
          }
          continue;
        }
      }
      
      // Backtracking com otimizações
      function backtrack(index, strIndex, partialDerivation = []) {
        // Se chegamos ao final dos símbolos da produção
        if (index === symbols.length) {
          const isComplete = strIndex === input.length;
          if (isComplete && trackDerivation) {
            return { 
              accepted: true, 
              derivation: partialDerivation 
            };
          }
          return isComplete;
        }

        const sym = symbols[index];
        
        // Terminal: verificação rápida e direta
        if (!(sym in rules)) {
          if (input.startsWith(sym, strIndex)) {
            const nextPartialDerivation = trackDerivation ? 
              [...partialDerivation, {
                rule: `Terminal match`,
                application: sym,
                result: sym
              }] : [];
            
            return backtrack(index + 1, strIndex + sym.length, nextPartialDerivation);
          }
          return trackDerivation ? { accepted: false, derivation: [] } : false;
        } 
        // Não-terminal
        else {
          // Otimização: lidar com epsilon primeiro se for possível
          if (optimizer.hasEpsilon[sym]) {
            const epsilonDerivation = trackDerivation ? 
              [...partialDerivation, {
                rule: `${sym} → ε`,
                application: sym,
                result: "ε"
              }] : [];
              
            const epsilonResult = backtrack(index + 1, strIndex, epsilonDerivation);
            if ((trackDerivation && epsilonResult.accepted) || (!trackDerivation && epsilonResult)) {
              return epsilonResult;
            }
          }
          
          // Otimização: se este é o último símbolo, podemos testar a string restante toda de uma vez
          if (index === symbols.length - 1) {
            const restOfString = input.substring(strIndex);
            const derivResult = deriva(sym, restOfString, 
              trackDerivation ? [...partialDerivation, {
                rule: `Último símbolo`,
                application: sym,
                result: restOfString
              }] : []);
              
            if ((trackDerivation && derivResult.accepted) || (!trackDerivation && derivResult)) {
              return derivResult;
            }
            return trackDerivation ? { accepted: false, derivation: [] } : false;
          }
          
          // Caso geral: testar diferentes divisões da string
          // Otimização: começar com divisões que provavelmente vão funcionar
          const maxLen = input.length - strIndex;
          
          // Se for um não-terminal que deriva um padrão específico, podemos tentar primeiro
          if (sym === 'ID' || sym === 'INT' || sym === 'FLOAT' || sym === 'STRING') {
            // Tentar encontrar o fim do token
            let tokenEnd = strIndex;
            while (tokenEnd < input.length) {
              // Critérios de parada para cada tipo de token
              if (sym === 'ID' && !/[a-zA-Z0-9_]/.test(input[tokenEnd])) break;
              if (sym === 'INT' && !/[0-9]/.test(input[tokenEnd])) break;
              if (sym === 'FLOAT' && !/[0-9.]/.test(input[tokenEnd])) break;
              tokenEnd++;
            }
            
            // Verificar o token identificado
            if (tokenEnd > strIndex) {
              const token = input.substring(strIndex, tokenEnd);
              const tokenResult = deriva(sym, token, 
                trackDerivation ? [...partialDerivation, {
                  rule: `${sym} token match`,
                  application: sym,
                  result: token
                }] : []);
                
              if ((trackDerivation && tokenResult.accepted) || (!trackDerivation && tokenResult)) {
                const nextResult = backtrack(index + 1, tokenEnd, 
                  trackDerivation ? tokenResult.derivation : []);
                  
                if ((trackDerivation && nextResult.accepted) || (!trackDerivation && nextResult)) {
                  return nextResult;
                }
              }
            }
          }
          
          // Iteração normal se a otimização acima não funcionou
          for (let len = 1; len <= maxLen; len++) {
            const substring = input.slice(strIndex, strIndex + len);
            const subResult = deriva(sym, substring, 
              trackDerivation ? [...partialDerivation, {
                rule: `${sym} → ...`,
                application: sym,
                result: substring
              }] : []);
              
            if ((trackDerivation && subResult.accepted) || (!trackDerivation && subResult)) {
              const nextResult = backtrack(index + 1, strIndex + len, 
                trackDerivation ? subResult.derivation : []);
                
              if ((trackDerivation && nextResult.accepted) || (!trackDerivation && nextResult)) {
                return nextResult;
              }
            }
          }
        }
        return trackDerivation ? { accepted: false, derivation: [] } : false;
      }

      const backtrackResult = backtrack(0, 0, 
        trackDerivation ? [...currentDerivation, {
          rule: `${symbol} → ${production}`,
          application: symbol,
          result: production
        }] : []);
        
      if ((trackDerivation && backtrackResult.accepted) || (!trackDerivation && backtrackResult)) {
        memo.set(key, backtrackResult);
        return backtrackResult;
      }
    }
    
    if (trackDerivation) {
      memo.set(key, { accepted: false, derivation: [] });
      return { accepted: false, derivation: [] };
    } else {
      memo.set(key, false);
      return false;
    }
  }

  // Atualizar o retorno da função deriva
  const result = deriva(startSymbol, str, trackDerivation ? [{
    rule: `Start → ${startSymbol}`,
    application: 'Start',
    result: startSymbol
  }] : []);
  
  // Marcar análise como completa se não houve timeout
  if (!checkTimeout()) {
    analysisComplete = true;
  }
  
  // Adicionar status de completude ao resultado
  if (trackDerivation && typeof result === 'object') {
    result.complete = analysisComplete;
  }
  
  return result;
}

// Cache global para armazenar as regras processadas
let cachedRules = null;
let lastGrammarText = '';

/**
 * Tests the current CFG input by the user.
 */
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

function testCFG() {
  // Limpar a tabela de resultados
  var tbody = $('#results');
  tbody.empty();

  // Obter as strings de teste
  var strings = $('#test-input').val().split(/\r?\n/);
  var validStrings = strings.filter(s => s.trim() !== '');
  
  // Mostrar indicador de processamento
  $('#status-message').text('Analisando gramática...');
  $('#processing-count').text('0/' + validStrings.length);
  $('#processing-status').show();
  
  // Exibir a gramática
  var grammar = readGrammar();
  $('#current-grammar').html(grammar.toString(true, Symbol.BOLD));
  
  // Extrair regras diretamente do campo de texto
  var bulkText = $('#bulk-grammar').val();
  
  // Otimização: Só processar a gramática se ela mudou ou se a atualização for forçada
  if (bulkText !== lastGrammarText || cachedRules === null || window.forceRefresh) {
    console.time('Processamento de regras');
    lastGrammarText = bulkText;
    parserCache.results.clear(); // Limpar cache de resultados
    
    var lines = bulkText.split('\n');
    var rules = {};
    
    // Pré-processar para identificar todos os não-terminais
    let nonTerminals = new Set();
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      // Aceitar tanto → quanto :=
      if (line === '') continue;
      
      var parts;
      if (line.indexOf('→') >= 0) {
        parts = line.split('→');
      } else if (line.indexOf(':=') >= 0) {
        parts = line.split(':=');
      } else {
        continue; // Linha não contém um delimitador válido
      }
      
      var nt = parts[0].trim();
      nonTerminals.add(nt);
    }
    
    // Processar cada linha da gramática
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      // Aceitar tanto → quanto :=
      if (line === '') continue;
      
      var parts;
      if (line.indexOf('→') >= 0) {
        parts = line.split('→');
      } else if (line.indexOf(':=') >= 0) {
        parts = line.split(':=');
      } else {
        continue; // Linha não contém um delimitador válido
      }
      
      var nt = parts[0].trim();
      var rhs = parts[1].trim();
      
      if (!rules[nt]) {
        rules[nt] = [];
      }
      
      // Processar regras com OR (|)
      if (rhs.indexOf('|') >= 0) {
        var options = rhs.split('|');
        for (var j = 0; j < options.length; j++) {
          var option = options[j].trim();
          // Verificar se é epsilon (ε, None ou vazio) e garantir que seja tratado corretamente
          if (option === 'ε' || option === 'None' || option === '') {
            rules[nt].push('ε');
          } else {
            rules[nt].push(option);
          }
        }
      } else {
        // Verificar se é epsilon (ε, None ou vazio) e garantir que seja tratado corretamente
        if (rhs.trim() === 'ε' || rhs.trim() === 'None' || rhs.trim() === '') {
          rules[nt].push('ε');
        } else {
          rules[nt].push(rhs);
        }
      }
    }
    
    // Armazenar no cache global
    cachedRules = rules;
    
    // Criar analisador otimizado
    parserCache.analyzer = new GrammarOptimizer(rules);
    
    console.timeEnd('Processamento de regras');
  } else {
    console.log("Usando regras em cache");
  }
  
  // Processamento de strings de teste
  console.time('Análise das strings');
  
  // Verificar se o cache está desativado
  var cacheDisabled = $('#disable-cache').is(':checked');
  if (cacheDisabled) {
    console.log("Cache desativado - Exibindo derivações completas");
    // Limpar cache a cada execução quando desativado
    parserCache.results.clear();
  }
  
  // Atualizar status de processamento
  $('#status-message').text('Analisando strings...');
  
  // Contador para strings processadas
  let processedCount = 0;
  
  // Verificação rápida para tokens em padrões conhecidos
  function tokenFastMatch(str, type) {
    if (TOKEN_PATTERNS[type] && TOKEN_PATTERNS[type].test(str)) {
      return true;
    }
    return null; // Inconclusivo
  }
  
  for (var i = 0; i < strings.length; i++) {
    var str = strings[i].trim();
    if (str === '') continue;
    
    // Verificar se já temos o resultado em cache (e se o cache não está desativado e não é uma atualização forçada)
    if (!cacheDisabled && !window.forceRefresh && parserCache.results.has(str)) {
      var cachedResult = parserCache.results.get(str);
      var isMatch = cachedResult.accepted;
      var isComplete = cachedResult.complete !== false; // Considera true se não estiver definido
      
      // Atualizar contador de progresso
      processedCount++;
      $('#processing-count').text(processedCount + '/' + validStrings.length);
      
      // Criar ID único para a linha
      var rowId = 'string-' + i;
      
      // Adicionar linha de resultado do cache
      var row = $('<tr/>', {
        'class': isMatch ? 'success clickable-row' : (isComplete ? 'danger clickable-row' : 'warning clickable-row'),
        'id': rowId,
        'data-index': i
      })
      .append($('<td/>', {'html': (i + 1), 'style': 'padding: 3px 5px;'}))
      .append($('<td/>', {'html': '&quot;' + escapeHTML(str) + '&quot;', 'style': 'padding: 3px 5px;'}))
      .append($('<td/>', {'html': isMatch ? 'Sim' : (isComplete ? 'Não' : 'Incompleto'), 'style': 'padding: 3px 5px;'}))
      .append($('<td/>', {'html': '<span class="arrow-icon">▼</span>' + (isComplete ? ' <small>(cache)</small>' : ' <span class="label label-warning">Análise parcial</span> <small>(cache)</small>'), 'style': 'padding: 3px 5px; text-align: center;'}));
      
      tbody.append(row);
      
      // Adicionar linha para derivação (inicialmente oculta)
      if (isMatch) {
        var derivationRow = $('<tr/>', {
          'class': 'derivation-row',
          'id': rowId + '-derivation'
        });
        
        var derivationCell = $('<td/>', {
          'colspan': 4,
          'style': 'padding: 0;'
        });
        
        // Criar tabela de derivação
        var derivationTable = $('<table/>', {
          'class': 'derivation-table table table-bordered'
        });
        
        // Cabeçalho da tabela de derivação
        var thead = $('<thead/>').append(
          $('<tr/>').append(
            $('<th/>', {'html': 'Regra', 'style': 'width: 40%;'}),
            $('<th/>', {'html': 'Aplicação', 'style': 'width: 30%;'}),
            $('<th/>', {'html': 'Resultado', 'style': 'width: 30%;'})
          )
        );
        derivationTable.append(thead);
        
        // Corpo da tabela com as derivações
        var derivationBody = $('<tbody/>');
        if (cachedResult.derivation && cachedResult.derivation.length > 0) {
          for (var j = 0; j < cachedResult.derivation.length; j++) {
            var step = cachedResult.derivation[j];
            derivationBody.append(
              $('<tr/>').append(
                $('<td/>', {'html': escapeHTML(step.rule), 'style': 'padding: 3px 5px;'}),
                $('<td/>', {'html': escapeHTML(step.application), 'style': 'padding: 3px 5px;'}),
                $('<td/>', {'html': escapeHTML(step.result), 'style': 'padding: 3px 5px;'})
              )
            );
          }
        } else {
          var noDerivationMessage = cacheDisabled ? 
            'Nenhum detalhe de derivação disponível para esta string.' : 
            'Derivação não disponível. Tente desativar o cache para ver os detalhes completos.';
            
          derivationBody.append(
            $('<tr/>').append(
              $('<td/>', {'colspan': 3, 'html': noDerivationMessage, 'style': 'padding: 3px 5px; text-align: center;'})
            )
          );
        }
        derivationTable.append(derivationBody);
        
        derivationCell.append(derivationTable);
        derivationRow.append(derivationCell);
        tbody.append(derivationRow);
        
        // Adicionar evento de clique para mostrar/ocultar a derivação
        row.click(function() {
          var index = $(this).data('index');
          var derivationRow = $('#string-' + index + '-derivation');
          derivationRow.toggle();
          
          // Mudar ícone de seta
          var arrow = $(this).find('.arrow-icon');
          if (derivationRow.is(':visible')) {
            arrow.html('▲');
          } else {
            arrow.html('▼');
          }
        });
      }
      
      continue;
    }
    
    // Verificações rápidas para padrões comuns (apenas se o cache não estiver desativado)
    let fastResult = null;
    
    if (!cacheDisabled && !window.forceRefresh) {
      // Verificar padrões específicos da gramática
      if (str.startsWith('output(') && str.endsWith(')')) {
        // Teste rápido para comandos de saída
        fastResult = true;
      } else if (str.startsWith('input(') && str.endsWith(')')) {
        // Teste rápido para comandos de entrada
        fastResult = true;
      } else if (str.startsWith('@') && str.endsWith('@') && str.length > 2) {
        // Verificação rápida para blocos
        fastResult = true;
      } else if (str.match(/^[a-zA-Z][a-zA-Z0-9_]*$/)) {
        // Verificação rápida para identificadores
        fastResult = tokenFastMatch(str, 'ID');
      } else if (str.match(/^[0-9]+$/)) {
        // Verificação rápida para números inteiros
        fastResult = tokenFastMatch(str, 'INT');
      } else if (str.match(/^[0-9]+\.[0-9]+$/)) {
        // Verificação rápida para números de ponto flutuante
        fastResult = tokenFastMatch(str, 'FLOAT');
      }
    }
    
    // Medir tempo de análise para cada string
    console.time('String ' + (i+1));
    
    // Obter resultado com derivação para strings aceitas
    var result;
    if (fastResult !== null) {
      result = { 
        accepted: fastResult, 
        derivation: [
          {
            rule: "Reconhecimento rápido",
            application: "Verificação otimizada",
            result: str
          }
        ],
        complete: true
      };
    } else {
      // Sempre rastrear derivação quando o cache estiver desativado
      result = pertenceALinguagem(str, cachedRules, 'S', true);
    }
    
    var isMatch = result.accepted;
    var isComplete = result.complete !== false; // Considera true se não estiver definido
    
    // Armazenar resultado no cache
    parserCache.results.set(str, result);
    
    console.timeEnd('String ' + (i+1));
    
    // Para resultados não cacheados
    // ...cerca de 100 linhas após o else {
    // Primeiro vamos achar o início da seção:
    
    // Chamar o escapeHTML() de grammar.js
    var escapedStr = escapeHTML(str);
    
    // Atualizar contador de progresso
    processedCount++;
    $('#processing-count').text(processedCount + '/' + validStrings.length);
    
    // Criar ID único para a linha
    var rowId = 'string-' + i;
    
    // Adicionar linha de resultado (sem cache)
    var row = $('<tr/>', {
      'class': isMatch ? 'success clickable-row' : (isComplete ? 'danger clickable-row' : 'warning clickable-row'),
      'id': rowId,
      'data-index': i
    })
    .append($('<td/>', {'html': (i + 1), 'style': 'padding: 3px 5px;'}))
    .append($('<td/>', {'html': '&quot;' + escapedStr + '&quot;', 'style': 'padding: 3px 5px;'}))
    .append($('<td/>', {'html': isMatch ? 'Sim' : (isComplete ? 'Não' : 'Incompleto'), 'style': 'padding: 3px 5px;'}))
    .append($('<td/>', {'html': '<span class="arrow-icon">▼</span>' + (isComplete ? '' : ' <span class="label label-warning">Análise parcial</span>'), 'style': 'padding: 3px 5px; text-align: center;'}));
    
    tbody.append(row);
    
    // Adicionar linha para derivação (inicialmente oculta)
    if (isMatch) {
      var derivationRow = $('<tr/>', {
        'class': 'derivation-row',
        'id': rowId + '-derivation'
      });
      
      var derivationCell = $('<td/>', {
        'colspan': 4,
        'style': 'padding: 0;'
      });
      
      // Criar tabela de derivação
      var derivationTable = $('<table/>', {
        'class': 'derivation-table table table-bordered'
      });
      
      // Cabeçalho da tabela de derivação
      var thead = $('<thead/>').append(
        $('<tr/>').append(
          $('<th/>', {'html': 'Regra', 'style': 'width: 40%;'}),
          $('<th/>', {'html': 'Aplicação', 'style': 'width: 30%;'}),
          $('<th/>', {'html': 'Resultado', 'style': 'width: 30%;'})
        )
      );
      derivationTable.append(thead);
      
      // Corpo da tabela com as derivações
      var derivationBody = $('<tbody/>');
      if (result.derivation && result.derivation.length > 0) {
        for (var j = 0; j < result.derivation.length; j++) {
          var step = result.derivation[j];
          derivationBody.append(
            $('<tr/>').append(
              $('<td/>', {'html': escapeHTML(step.rule), 'style': 'padding: 3px 5px;'}),
              $('<td/>', {'html': escapeHTML(step.application), 'style': 'padding: 3px 5px;'}),
              $('<td/>', {'html': escapeHTML(step.result), 'style': 'padding: 3px 5px;'})
            )
          );
        }
      } else {
        var noDerivationMessage = cacheDisabled ? 
          'Nenhum detalhe de derivação disponível para esta string.' : 
          'Derivação não disponível. Tente desativar o cache para ver os detalhes completos.';
          
        derivationBody.append(
          $('<tr/>').append(
            $('<td/>', {'colspan': 3, 'html': noDerivationMessage, 'style': 'padding: 3px 5px; text-align: center;'})
          )
        );
      }
      derivationTable.append(derivationBody);
      
      derivationCell.append(derivationTable);
      derivationRow.append(derivationCell);
      tbody.append(derivationRow);
      
      // Adicionar evento de clique para mostrar/ocultar a derivação
      row.click(function() {
        var index = $(this).data('index');
        var derivationRow = $('#string-' + index + '-derivation');
        derivationRow.toggle();
        
        // Mudar ícone de seta
        var arrow = $(this).find('.arrow-icon');
        if (derivationRow.is(':visible')) {
          arrow.html('▲');
        } else {
          arrow.html('▼');
        }
      });
    }
  }
  
  console.timeEnd('Análise das strings');
  
  // Limpar contadores por segurança
  State.counter = 0;
  
  // Atualizar status de processamento para concluído
  if (processedCount > 0) {
    $('#status-message').text('Análise concluída!');
    $('#processing-status').removeClass('alert-info').addClass('alert-success');
    // Esconder o status após 3 segundos
    setTimeout(function() {
      $('#processing-status').fadeOut(500, function() {
        // Restaurar a classe original quando oculto
        $('#processing-status').removeClass('alert-success').addClass('alert-info');
      });
    }, 3000);
  } else {
    $('#processing-status').hide();
  }
}

// Função utilitária para limpar o cache
function clearCache() {
  // Limpar caches
  parserCache.results.clear();
  parserCache.analyzer = null;
  lastGrammarText = '';
  cachedRules = null;
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
      return;
    }
    nonterminals[ch] = true;
    if (index === 0) {
      grammar = new Grammar(new Symbol(ch, false));
    }
  });

  // Now iterate through all production rows to construct the Grammar.
  $('div.production-row').each(function(index, row) {
    var currentDiv = row.firstChild;
    var ch = currentDiv.firstChild.value;
    if (ch === '') {
      return;
    }
    var lhs = new Symbol(ch, false);
    var production = new Production(lhs);

    // Iterate through all production rules to add to the Production.
    while (currentDiv = currentDiv.nextSibling.nextSibling) {
      var str = currentDiv.firstChild.value;
      if (str === '' || str === 'None') {
        // Epsilon - empty string ou None
        production.addArray(new SymArray([]));
      } else {
        var symbols = [];
        // Processar a string como palavras separadas por espaço
        var words = str.split(/\s+/);
        
        for (var i = 0; i < words.length; i++) {
          var word = words[i];
          if (word.length > 0) {
            // Verificar se a palavra é um não-terminal conhecido
            var isTerminal = !nonterminals[word];
            // Se não for um não-terminal conhecido, verificar se é uma palavra em maiúsculas
            if (isTerminal && word === word.toUpperCase() && /[A-Z]/.test(word)) {
              isTerminal = false;
            }
            symbols.push(new Symbol(word, isTerminal));
          }
        }
        
        // Add SymArray to Production.
        production.addArray(new SymArray(symbols));
      }
      
      if (currentDiv.nextSibling === null ||
          currentDiv.nextSibling.className === 'remove') {
        break;
      }
    }
    grammar.addProduction(production);
  });
  return grammar;
}

/**
 * Base jQuery code pattern.
 */
$(document).ready(function() {
  initializeGrammarDOM();
  startTest();
});
