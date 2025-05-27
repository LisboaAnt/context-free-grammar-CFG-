/**
 * Funções para gerenciamento de gramáticas
 */

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
    $('#bulk-grammar').val(`
      S → COMANDO

COMANDO → BLOCO | VARIAVEL | ATRIBUICAO | ENTRADA | SAIDA | CONDICIONAL | REPETICAO

BLOCO → @ LISTACOMANDOS @

LISTACOMANDOS → COMANDO LISTACOMANDOS | ε

VARIAVEL → @ TIPO _ ID @

ATRIBUICAO → @ ID = EXPRESSAO @

ENTRADA → input ( ID )

SAIDA → output ( EXPRESSAO )

CONDICIONAL → if ( EXPRESSAO ) BLOCO ELSEOPT

ELSEOPT → else BLOCO | ε

REPETICAO → while ( EXPRESSAO ) BLOCO

EXPRESSAO → EXPRELACIONAL

EXPRELACIONAL → EXPARITMETICA EXPRELACIONALRESTO

EXPRELACIONALRESTO → OPREL EXPARITMETICA | ε

EXPARITMETICA → TERMO EXPARITMETICARESTO

EXPARITMETICARESTO → OPADD TERMO EXPARITMETICARESTO | ε

TERMO → FATOR TERMORESTO

TERMORESTO → OPMUL FATOR TERMORESTO | ε

FATOR → ID | INT | FLOAT | STRING | ( EXPRESSAO )

OPREL → < | > | != | ==

OPADD → + | -

OPMUL → * | /

TIPO → int | float | string

INT → DIGITO INTREST

INTREST → DIGITO INTREST | ε

FLOAT → INT . INT

STRING → CARACTERE STRINGREST

STRINGREST → CARACTERE STRINGREST | ε

ID → LETRA IDREST

IDREST → LETRA IDREST | DIGITO IDREST | ε

DIGITO → 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

LETRA → a | b | c 

CARACTERE → LETRA | DIGITO | _`);
    
    // Exemplos de teste que sabemos que funcionam
    $('#test-input').val(`output(a)
@ output(1) @
output(b)
@ @ 
@ output(3) @
if(a>b)@int_a@`);
    
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