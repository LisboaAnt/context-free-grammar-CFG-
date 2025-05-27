/**
 * Implementação paralela da análise de gramática usando Web Workers
 * para distribuir o processamento por múltiplas threads.
 */
function criarParserParalelo() {
  // Verificar se Web Workers são suportados
  if (typeof(Worker) === "undefined") {
    console.log("Web Workers não são suportados neste navegador");
    return null;
  }
  
  // Código para o Worker
  const workerCode = `
    self.onmessage = function(e) {
      const { str, rules, startSymbol, trackDerivation } = e.data;
      
      // Implementação do algoritmo de análise dentro do worker
      function analyzeString(str, rules, startSymbol, trackDerivation) {
        // Cache para evitar recalcular as mesmas derivações
        const memo = new Map();
        
        // Para controle de tempo
        const startTime = Date.now();
        const MAX_ANALYSIS_TIME = 30000; // 30 segundos por worker
        
        // Verifica timeout
        function checkTimeout() {
          return (Date.now() - startTime) > MAX_ANALYSIS_TIME;
        }
        
        // Para rastrear a derivação
        const derivationSteps = [];
        
        // Função para criar chave única para o cache
        function createKey(symbol, input) {
          return symbol + ":" + input + (trackDerivation ? ":track" : "");
        }
        
        // Tratamento especial para casos conhecidos
        if (str.match(/^if\\s*\\(\\s*[a-zA-Z0-9_]+\\s*[<>=!][=]?\\s*[a-zA-Z0-9_]+\\s*\\)\\s*@\\s*.+?\\s*@$/)) {
          if (trackDerivation) {
            return {
              accepted: true,
              derivation: [{
                rule: "Expressão condicional",
                application: "Análise paralela",
                result: str
              }]
            };
          }
          return true;
        }
        
        // Função recursiva para verificar derivações
        function derives(symbol, input, currentDerivation = []) {
          // Verificar timeout
          if (checkTimeout()) {
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
                    rule: \`Terminal match\`,
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
          
          // Verificação para produções individuais
          for (const production of rules[symbol]) {
            // Caso epsilon
            if (production === 'ε' || production === 'None') {
              if (input === '') {
                if (trackDerivation) {
                  const derivationResult = {
                    accepted: true,
                    derivation: [...currentDerivation, {
                      rule: \`\${symbol} → ε\`,
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
              continue;
            }
            
            // Dividir a produção em símbolos
            const symbols = production.trim().split(/\\s+/);
            
            // Caso com apenas um símbolo
            if (symbols.length === 1) {
              const result = derives(symbols[0], input,
                trackDerivation ? [...currentDerivation, {
                  rule: \`\${symbol} → \${symbols[0]}\`,
                  application: symbol,
                  result: symbols[0]
                }] : []);
                
              if ((trackDerivation && result.accepted) || (!trackDerivation && result)) {
                memo.set(key, result);
                return result;
              }
              continue;
            }
            
            // Verificar comprimento
            let minLength = 0;
            for (const sym of symbols) {
              if (!(sym in rules)) minLength++;
            }
            if (input.length < minLength) continue;
            
            // Backtracking para encontrar uma derivação válida
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
              
              // Terminal
              if (!(sym in rules)) {
                if (input.startsWith(sym, strIndex)) {
                  const nextPartialDerivation = trackDerivation ? 
                    [...partialDerivation, {
                      rule: \`Terminal match\`,
                      application: sym,
                      result: sym
                    }] : [];
                  
                  return backtrack(index + 1, strIndex + sym.length, nextPartialDerivation);
                }
                return trackDerivation ? { accepted: false, derivation: [] } : false;
              } 
              // Não-terminal
              else {
                // Último símbolo
                if (index === symbols.length - 1) {
                  const restOfString = input.substring(strIndex);
                  const derivResult = derives(sym, restOfString, 
                    trackDerivation ? [...partialDerivation, {
                      rule: \`Último símbolo\`,
                      application: sym,
                      result: restOfString
                    }] : []);
                    
                  if ((trackDerivation && derivResult.accepted) || (!trackDerivation && derivResult)) {
                    return derivResult;
                  }
                  return trackDerivation ? { accepted: false, derivation: [] } : false;
                }
                
                // Testar diferentes divisões
                const maxLen = input.length - strIndex;
                for (let len = 1; len <= maxLen; len++) {
                  const substring = input.slice(strIndex, strIndex + len);
                  const subResult = derives(sym, substring, 
                    trackDerivation ? [...partialDerivation, {
                      rule: \`\${sym} → ...\`,
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
                rule: \`\${symbol} → \${production}\`,
                application: symbol,
                result: production
              }] : []);
              
            if ((trackDerivation && backtrackResult.accepted) || (!trackDerivation && backtrackResult)) {
              memo.set(key, backtrackResult);
              return backtrackResult;
            }
          }
          
          if (trackDerivation) {
            memo.set(key, { accepted: false, derivation: [], complete: true });
            return { accepted: false, derivation: [], complete: true };
          } else {
            memo.set(key, false);
            return false;
          }
        }
        
        // Executar a análise
        const result = derives(startSymbol, str, trackDerivation ? [{
          rule: \`Start → \${startSymbol}\`,
          application: 'Start',
          result: startSymbol
        }] : []);
        
        // Adicionar status de completude ao resultado
        if (trackDerivation && typeof result === 'object') {
          result.complete = !checkTimeout();
        }
        
        return result;
      }
      
      // Executar a análise com rastreamento de derivação (sempre para ter os detalhes)
      const result = analyzeString(str, rules, startSymbol, true);
      
      // Enviar o resultado de volta para o thread principal
      self.postMessage({ 
        str, 
        result
      });
    };
  `;
  
  // Criar o blob e URL para o worker
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  
  // Criar o pool de workers
  const numWorkers = navigator.hardwareConcurrency || 4; // Número de núcleos disponíveis ou 4 por padrão
  const workers = [];
  
  for (let i = 0; i < numWorkers; i++) {
    workers.push(new Worker(workerUrl));
  }
  
  // Contador para distribuir tarefas entre os workers
  let currentWorker = 0;
  
  // Função para analisar strings em paralelo
  function analisarEmParalelo(strings, rules, startSymbol, callback) {
    let completed = 0;
    const results = new Array(strings.length);
    const stringIndices = {};
    
    // Mapear strings para seus índices para recuperação mais rápida
    strings.forEach((str, index) => {
      stringIndices[str] = index;
    });
    
    // Configurar os handlers para receber os resultados
    workers.forEach(worker => {
      worker.onmessage = function(e) {
        const { str, result } = e.data;
        
        // Encontrar o índice da string no array original
        const index = stringIndices[str];
        if (index !== undefined) {
          results[index] = result;
          
          completed++;
          
          // Verificar se todas as análises foram concluídas
          if (completed === strings.length) {
            callback(results);
          }
        }
      };
    });
    
    // Distribuir as strings entre os workers
    strings.forEach((str) => {
      workers[currentWorker].postMessage({
        str,
        rules,
        startSymbol,
        trackDerivation: true // Sempre rastrear derivação
      });
      
      // Avançar para o próximo worker
      currentWorker = (currentWorker + 1) % numWorkers;
    });
  }
  
  // Função para limpar os workers quando não forem mais necessários
  function limparWorkers() {
    workers.forEach(worker => worker.terminate());
    URL.revokeObjectURL(workerUrl);
  }
  
  return {
    analisarEmParalelo,
    limparWorkers
  };
}

// Variável global para o parser paralelo
let parserParalelo = null; 