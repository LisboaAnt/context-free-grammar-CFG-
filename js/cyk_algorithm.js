/**
 * Implementação do algoritmo CYK (Cocke-Younger-Kasami) para análise de gramáticas livres de contexto
 */

/**
 * Implementação de um algoritmo CYK (Cocke-Younger-Kasami) modificado para análise eficiente de gramáticas livres de contexto.
 * Esta é uma abordagem de programação dinâmica que constrói uma tabela de análise de forma ascendente (bottom-up).
 * 
 * @param {string} input - A string a ser analisada
 * @param {Object} rules - As regras da gramática
 * @param {string} startSymbol - O símbolo inicial da gramática
 * @param {boolean} trackDerivation - Se deve rastrear os passos da derivação
 * @returns {Object|boolean} - Objeto com a aceitação e derivação se trackDerivation for true, boolean caso contrário
 */
function cykParser(input, rules, startSymbol = 'S', trackDerivation = false) {
  // Validação rápida para strings vazias
  if (input === '') {
    // Verificar se o símbolo inicial pode derivar ε
    for (const prod of rules[startSymbol] || []) {
      if (prod === 'ε' || prod === 'None') {
        if (trackDerivation) {
          return {
            accepted: true,
            derivation: [
              {
                rule: `${startSymbol} → ε`,
                application: startSymbol,
                result: "ε"
              }
            ],
            complete: true
          };
        }
        return true;
      }
    }
    if (trackDerivation) {
      return { accepted: false, derivation: [], complete: true };
    }
    return false;
  }
  
  // Tratar casos especiais conhecidos para garantir precisão
  // Verificações específicas para o caso "if(a>b)@int_a@"
  if (input.match(/^if\s*\(\s*[a-zA-Z0-9_]+\s*[<>=!][=]?\s*[a-zA-Z0-9_]+\s*\)\s*@\s*.+?\s*@$/)) {
    // Usar o algoritmo tradicional para estes casos específicos para garantir precisão
    return pertenceALinguagem(input, rules, startSymbol, trackDerivation);
  }
  
  // Para expressões condicionais, de repetição e blocos, também usar o algoritmo tradicional
  if (input.startsWith('if(') || input.startsWith('while(') || 
      (input.startsWith('@') && input.endsWith('@')) ||
      input.startsWith('output(') || input.startsWith('input(')) {
    return pertenceALinguagem(input, rules, startSymbol, trackDerivation);
  }
  
  const n = input.length;
  
  // Criar tabela de programação dinâmica
  // table[i][j] contém o conjunto de não-terminais que podem derivar a substring input[i:i+j+1]
  // e backtrack[i][j][nt] contém informações sobre como essa derivação foi feita
  const table = Array(n).fill().map(() => Array(n).fill().map(() => new Set()));
  const backtrack = Array(n).fill().map(() => Array(n).fill().map(() => ({})));
  
  // Preencher a diagonal principal (substrings de comprimento 1)
  for (let i = 0; i < n; i++) {
    const char = input[i];
    
    // Verificar cada não-terminal
    for (const nt in rules) {
      for (const prod of rules[nt]) {
        // Se a produção é um terminal que corresponde ao caractere atual
        if (prod === char) {
          table[i][0].add(nt);
          backtrack[i][0][nt] = { type: 'terminal', value: char };
        }
        
        // Verificar padrões específicos para produções mais complexas
        if (prod.length === 1 && prod === char) {
          table[i][0].add(nt);
          backtrack[i][0][nt] = { type: 'terminal', value: char };
        }
      }
    }
    
    // Verificações especiais para tokens
    for (const nt in TOKEN_PATTERNS) {
      if (TOKEN_PATTERNS[nt].test(char)) {
        table[i][0].add(nt);
        backtrack[i][0][nt] = { type: 'token', value: char };
      }
    }
  }
  
  // Preencher o resto da tabela para substrings maiores
  for (let len = 1; len < n; len++) {
    for (let i = 0; i < n - len; i++) {
      const j = len;
      
      // Considerar todas as divisões possíveis da substring input[i:i+j+1]
      for (let k = 0; k < j; k++) {
        // Para cada par de não-terminais que derivam as duas partes da substring
        for (const ntB of table[i][k]) {
          for (const ntC of table[i + k + 1][j - k - 1]) {
            // Verificar se algum não-terminal pode derivar B C
            for (const nt in rules) {
              for (const prod of rules[nt]) {
                const symbols = prod.trim().split(/\s+/);
                
                // Verificar se a produção é da forma "B C"
                if (symbols.length === 2 && symbols[0] === ntB && symbols[1] === ntC) {
                  table[i][j].add(nt);
                  if (!backtrack[i][j][nt]) {
                    backtrack[i][j][nt] = {
                      type: 'binary',
                      rule: `${nt} → ${ntB} ${ntC}`,
                      split: k,
                      left: ntB,
                      right: ntC
                    };
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Verificar se o símbolo inicial pode derivar a string completa
  const accepted = table[0][n - 1].has(startSymbol);
  
  // Se não estamos rastreando a derivação, retornar apenas a aceitação
  if (!trackDerivation) {
    return accepted;
  }
  
  // Se a string foi aceita e queremos rastrear a derivação, reconstruir a derivação
  if (accepted) {
    const derivation = [];
    
    // Função recursiva para reconstruir a derivação
    function reconstructDerivation(i, j, nt) {
      const data = backtrack[i][j][nt];
      
      if (!data) return;
      
      if (data.type === 'terminal' || data.type === 'token') {
        derivation.push({
          rule: `${nt} → ${data.value}`,
          application: nt,
          result: data.value
        });
      } else if (data.type === 'binary') {
        derivation.push({
          rule: data.rule,
          application: nt,
          result: `${data.left} ${data.right}`
        });
        
        reconstructDerivation(i, data.split, data.left);
        reconstructDerivation(i + data.split + 1, j - data.split - 1, data.right);
      }
    }
    
    reconstructDerivation(0, n - 1, startSymbol);
    
    // Adicionar etapa final
    derivation.push({
      rule: "Final",
      application: "Derivação CYK",
      result: input
    });
    
    return {
      accepted: true,
      derivation: derivation,
      complete: true
    };
  }
  
  // Se a string não foi aceita, retornar um objeto com aceitação falsa
  return {
    accepted: false,
    derivation: [{
      rule: "Algoritmo CYK - Falha",
      application: "Programação Dinâmica",
      result: "String não aceita pela gramática"
    }],
    complete: true
  };
} 