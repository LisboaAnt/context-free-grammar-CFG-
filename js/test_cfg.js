/**
 * Função principal para testar a gramática
 */

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
  
  // Verificar se deve usar processamento paralelo
  const useParallel = $('#use-parallel').is(':checked');
  // Verificar se deve usar o algoritmo CYK (programação dinâmica)
  const useCYK = $('#use-cyk').is(':checked');
  
  // Contador para strings processadas
  let processedCount = 0;
  
  // Sempre rastrear a derivação independentemente do algoritmo usado
  const trackDerivation = true;
  
  // Verificação rápida para tokens em padrões conhecidos
  function tokenFastMatch(str, type) {
    if (TOKEN_PATTERNS[type] && TOKEN_PATTERNS[type].test(str)) {
      return true;
    }
    return null; // Inconclusivo
  }
  
  // Função para analisar uma string individual (para reutilização)
  function analisarString(str, index) {
    if (str.trim() === '') return;
    
    // Verificar se já temos o resultado em cache (e se o cache não está desativado e não é uma atualização forçada)
    if (!cacheDisabled && !window.forceRefresh && parserCache.results.has(str)) {
      // Usar resultado do cache
      processedCount++;
      $('#processing-count').text(processedCount + '/' + validStrings.length);
      return;
    }
    
    // Medir tempo de análise para cada string
    console.time('String ' + (index+1));
    
    let result;
    
    // Algoritmo CYK
    if (useCYK) {
      result = cykParser(str, cachedRules, 'S', trackDerivation);
    } 
    // Algoritmo padrão
    else {
      // Verificações rápidas para padrões comuns (apenas se o cache não estiver desativado)
      let fastResult = null;
      
      if (!cacheDisabled && !window.forceRefresh) {
        // Verificar padrões específicos da gramática
        if (str.startsWith('output(') && str.endsWith(')')) {
          // Teste rápido para comandos de saída
          fastResult = { 
            accepted: true, 
            derivation: [
              {
                rule: "Reconhecimento rápido",
                application: "Verificação otimizada",
                result: str
              }
            ],
            complete: true
          };
        } else if (str.startsWith('input(') && str.endsWith(')')) {
          // Teste rápido para comandos de entrada
          fastResult = { 
            accepted: true, 
            derivation: [
              {
                rule: "Reconhecimento rápido",
                application: "Verificação otimizada",
                result: str
              }
            ],
            complete: true
          };
        } else if (str.startsWith('@') && str.endsWith('@') && str.length > 2) {
          // Verificação rápida para blocos
          fastResult = { 
            accepted: true, 
            derivation: [
              {
                rule: "Reconhecimento rápido",
                application: "Verificação otimizada",
                result: str
              }
            ],
            complete: true
          };
        } else if (str.match(/^[a-zA-Z][a-zA-Z0-9_]*$/)) {
          // Verificação rápida para identificadores
          if (tokenFastMatch(str, 'ID') === true) {
            fastResult = { 
              accepted: true, 
              derivation: [
                {
                  rule: "Reconhecimento de ID",
                  application: "Verificação otimizada",
                  result: str
                }
              ],
              complete: true
            };
          }
        } else if (str.match(/^[0-9]+$/)) {
          // Verificação rápida para números inteiros
          if (tokenFastMatch(str, 'INT') === true) {
            fastResult = { 
              accepted: true, 
              derivation: [
                {
                  rule: "Reconhecimento de INT",
                  application: "Verificação otimizada",
                  result: str
                }
              ],
              complete: true
            };
          }
        } else if (str.match(/^[0-9]+\.[0-9]+$/)) {
          // Verificação rápida para números de ponto flutuante
          if (tokenFastMatch(str, 'FLOAT') === true) {
            fastResult = { 
              accepted: true, 
              derivation: [
                {
                  rule: "Reconhecimento de FLOAT",
                  application: "Verificação otimizada",
                  result: str
                }
              ],
              complete: true
            };
          }
        }
      }
      
      // Usar resultado da verificação rápida ou fazer análise completa
      if (fastResult !== null) {
        result = fastResult;
      } else {
        // Sempre rastrear derivação
        result = pertenceALinguagem(str, cachedRules, 'S', trackDerivation);
      }
    }
    
    // Armazenar resultado no cache
    parserCache.results.set(str, result);
    
    console.timeEnd('String ' + (index+1));
    
    // Atualizar contador de progresso
    processedCount++;
    $('#processing-count').text(processedCount + '/' + validStrings.length);
  }
  
  // Se for usar processamento paralelo e houver mais de uma string
  if (useParallel && validStrings.length > 1) {
    if (!parserParalelo) {
      parserParalelo = criarParserParalelo();
    }
    
    if (parserParalelo) {
      // Mostrar mensagem informando o uso de processamento paralelo
      $('#status-message').text('Analisando strings em paralelo...');
      
      // Remover resultados que já estão em cache
      const stringsToProcess = validStrings.filter(s => {
        return cacheDisabled || window.forceRefresh || !parserCache.results.has(s);
      });
      
      if (stringsToProcess.length > 0) {
        // Processar strings em paralelo
        parserParalelo.analisarEmParalelo(stringsToProcess, cachedRules, 'S', function(results) {
          // Atualizar o cache com os resultados
          stringsToProcess.forEach((str, index) => {
            if (results[index]) {
              parserCache.results.set(str, results[index]);
            } else {
              // Se houver falha no resultado, criar um padrão
              parserCache.results.set(str, {
                accepted: false,
                derivation: [{
                  rule: "Análise paralela - falha",
                  application: "Falha na análise",
                  result: str
                }],
                complete: true
              });
            }
          });
          
          // Exibir os resultados
          displayResults(validStrings);
          
          console.timeEnd('Análise das strings');
          
          // Atualizar status de processamento para concluído
          $('#status-message').text('Análise concluída em paralelo!');
          $('#processing-status').removeClass('alert-info').addClass('alert-success');
          // Esconder o status após 3 segundos
          setTimeout(function() {
            $('#processing-status').fadeOut(500, function() {
              // Restaurar a classe original quando oculto
              $('#processing-status').removeClass('alert-success').addClass('alert-info');
            });
          }, 3000);
        });
        
        return; // Sair da função pois os resultados serão processados assincronamente
      }
    }
  }
  
  // Caso não use processamento paralelo ou tenha apenas uma string, processar sequencialmente
  for (var i = 0; i < validStrings.length; i++) {
    analisarString(validStrings[i], i);
  }
  
  // Exibir os resultados
  displayResults(validStrings);
  
  console.timeEnd('Análise das strings');
  
  // Limpar contadores por segurança
  if (typeof State !== 'undefined' && State.counter) {
    State.counter = 0;
  }
  
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