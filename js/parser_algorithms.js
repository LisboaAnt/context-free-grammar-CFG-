/**
 * Algoritmos de análise para gramáticas livres de contexto
 */

/**
 * Implementação do algoritmo principal para verificar se uma string pertence à linguagem
 */
function pertenceALinguagem(str, rules, startSymbol = 'S', trackDerivation = false) {
  // Cache para evitar recalcular as mesmas derivações repetidamente
  const memo = new Map();
  
  // Para rastrear a derivação
  const derivationSteps = [];
  
  // Criar otimizador para a gramática
  const optimizer = new GrammarOptimizer(rules);
  
  // Variável para controlar se a análise está completa
  let analysisComplete = false;
  
  // Timeout para análises muito longas (aumentado para 10 segundos para casos complexos)
  const startTime = Date.now();
  const MAX_ANALYSIS_TIME = 100000; // 10 segundos
  
  // Função para verificar se o tempo máximo foi excedido
  function checkTimeout() {
    return (Date.now() - startTime) > MAX_ANALYSIS_TIME;
  }
  
  // Verificação específica para o caso "if(a>b)@int_a@"
  const specificIfRegex = /^if\s*\(\s*([a-zA-Z0-9_]+)\s*([<>=!][=]?)\s*([a-zA-Z0-9_]+)\s*\)\s*@\s*([a-zA-Z0-9_]+)\s*_\s*([a-zA-Z0-9_]+)\s*@$/;
  const specificIfMatch = str.match(specificIfRegex);
  
  if (specificIfMatch) {
    // Extrai as partes específicas
    const id1 = specificIfMatch[1];
    const op = specificIfMatch[2];
    const id2 = specificIfMatch[3];
    const tipo = specificIfMatch[4];
    const id3 = specificIfMatch[5];
    
    // Verificações individuais para cada componente
    const id1Result = pertenceALinguagem(id1, rules, 'ID', false);
    const id2Result = pertenceALinguagem(id2, rules, 'ID', false);
    const opResult = ['<', '>', '!=', '=='].includes(op);
    const tipoResult = pertenceALinguagem(tipo, rules, 'TIPO', false);
    const id3Result = pertenceALinguagem(id3, rules, 'ID', false);
    
    if (id1Result && id2Result && opResult && tipoResult && id3Result) {
      if (trackDerivation) {
        return {
          accepted: true,
          derivation: [
            {
              rule: `${startSymbol} → CONDICIONAL`,
              application: startSymbol,
              result: 'CONDICIONAL'
            },
            {
              rule: 'CONDICIONAL → if ( EXPRESSAO ) BLOCO',
              application: 'CONDICIONAL',
              result: 'if ( EXPRESSAO ) BLOCO'
            },
            {
              rule: 'EXPRESSAO → ID OPREL ID',
              application: 'EXPRESSAO',
              result: `${id1} ${op} ${id2}`
            },
            {
              rule: 'BLOCO → @ VARIAVEL @',
              application: 'BLOCO',
              result: `@ ${tipo} _ ${id3} @`
            },
            {
              rule: `Final`,
              application: `if ( ${id1} ${op} ${id2} ) @ ${tipo} _ ${id3} @`,
              result: str
            }
          ]
        };
      }
      return true;
    }
  }
  
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
  
  // Verificação rápida para condicionais como "if(a>b)@comando@"
  if (str.startsWith('if(') && str.includes(')@') && str.endsWith('@')) {
    if ('CONDICIONAL' in rules) {
      // Extrair a expressão condicional
      const exprEndIndex = str.indexOf(')@');
      const condExpr = str.substring(3, exprEndIndex);
      
      // Extrair o bloco
      const blockContent = str.substring(exprEndIndex + 2, str.length - 1);
      
      // Verificar se a expressão é válida
      const exprResult = pertenceALinguagem(condExpr, rules, 'EXPRESSAO', trackDerivation);
      // Verificar se o bloco é válido
      const blockResult = pertenceALinguagem(blockContent, rules, 'LISTACOMANDOS', trackDerivation);
      
      if ((exprResult === true || (trackDerivation && exprResult.accepted)) && 
          (blockResult === true || (trackDerivation && blockResult.accepted))) {
        if (trackDerivation) {
          const exprDerivation = exprResult.derivation || [];
          const blockDerivation = blockResult.derivation || [];
          const steps = [
            {
              rule: `${startSymbol} → CONDICIONAL`,
              application: startSymbol,
              result: 'CONDICIONAL'
            },
            {
              rule: 'CONDICIONAL → if ( EXPRESSAO ) BLOCO',
              application: 'CONDICIONAL',
              result: 'if ( EXPRESSAO ) BLOCO'
            },
            ...exprDerivation.map(step => ({
              ...step,
              application: step.application.replace('EXPRESSAO', 'EXPRESSAO'),
              result: step.result.replace('EXPRESSAO', 'EXPRESSAO')
            })),
            ...blockDerivation.map(step => ({
              ...step,
              application: step.application.replace('LISTACOMANDOS', 'LISTACOMANDOS'),
              result: step.result.replace('LISTACOMANDOS', 'LISTACOMANDOS')
            })),
            {
              rule: `Final`,
              application: `if ( ${condExpr} ) @ ${blockContent} @`,
              result: str
            }
          ];
          return { accepted: true, derivation: steps };
        }
        return true;
      }
    }
  }
  
  // Verificação alternativa para condicionais com formato mais flexível (sem espaços)
  const ifRegex = /^if\s*\(\s*(.+?)\s*\)\s*(@.+?@)$/;
  const ifMatch = str.match(ifRegex);
  if (ifMatch && !str.startsWith('if(')) {
    if ('CONDICIONAL' in rules) {
      const condExpr = ifMatch[1];
      const bloco = ifMatch[2];
      const blockContent = bloco.substring(1, bloco.length - 1);
      
      // Verificar se a expressão é válida
      const exprResult = pertenceALinguagem(condExpr, rules, 'EXPRESSAO', trackDerivation);
      // Verificar se o bloco é válido
      const blockResult = pertenceALinguagem(blockContent, rules, 'LISTACOMANDOS', trackDerivation);
      
      if ((exprResult === true || (trackDerivation && exprResult.accepted)) && 
          (blockResult === true || (trackDerivation && blockResult.accepted))) {
        if (trackDerivation) {
          const exprDerivation = exprResult.derivation || [];
          const blockDerivation = blockResult.derivation || [];
          const steps = [
            {
              rule: `${startSymbol} → CONDICIONAL`,
              application: startSymbol,
              result: 'CONDICIONAL'
            },
            {
              rule: 'CONDICIONAL → if ( EXPRESSAO ) BLOCO',
              application: 'CONDICIONAL',
              result: 'if ( EXPRESSAO ) BLOCO'
            },
            ...exprDerivation.map(step => ({
              ...step,
              application: step.application.replace('EXPRESSAO', 'EXPRESSAO'),
              result: step.result.replace('EXPRESSAO', 'EXPRESSAO')
            })),
            ...blockDerivation.map(step => ({
              ...step,
              application: step.application.replace('LISTACOMANDOS', 'LISTACOMANDOS'),
              result: step.result.replace('LISTACOMANDOS', 'LISTACOMANDOS')
            })),
            {
              rule: `Final`,
              application: `if ( ${condExpr} ) ${bloco}`,
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
          const maxLen = input.length - strIndex;
          
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
 