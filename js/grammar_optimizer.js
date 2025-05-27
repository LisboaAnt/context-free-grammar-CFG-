/**
 * Otimizador para gramáticas - analisa as regras antes para otimizar o processamento
 */
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
    this.analyzeCommonPatterns();
  }
  
  // Analisa padrões comuns na gramática para otimizar o processamento
  analyzeCommonPatterns() {
    this.patterns = {
      'if_pattern': /^if\s*\(\s*(.+?)\s*\)\s*(@.+?@)$/,
      'while_pattern': /^while\s*\(\s*(.+?)\s*\)\s*(@.+?@)$/,
      'var_pattern': /^@\s*([a-zA-Z]+)\s*_\s*([a-zA-Z][a-zA-Z0-9_]*)\s*@$/,
      'assign_pattern': /^@\s*([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*(.+?)\s*@$/,
      'relational_pattern': /^([a-zA-Z][a-zA-Z0-9_]*)\s*([<>=!][=]?)\s*([a-zA-Z][a-zA-Z0-9_]*|[0-9]+)$/
    };
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
    
    // Verificações de padrões para símbolos específicos
    if (symbol === 'CONDICIONAL' && this.patterns.if_pattern.test(input)) {
      return true;
    }
    
    if (symbol === 'REPETICAO' && this.patterns.while_pattern.test(input)) {
      return true;
    }
    
    if (symbol === 'VARIAVEL' && this.patterns.var_pattern.test(input)) {
      return true;
    }
    
    if (symbol === 'ATRIBUICAO' && this.patterns.assign_pattern.test(input)) {
      return true;
    }
    
    if (symbol === 'EXPRELACIONAL' && this.patterns.relational_pattern.test(input)) {
      return true;
    }
    
    return null; // Não conseguimos determinar rápido, precisa fazer análise completa
  }
  
  // Método específico para verificar expressões relacionais
  checkRelationalExpression(expr) {
    const match = expr.match(this.patterns.relational_pattern);
    if (!match) return false;
    
    const id1 = match[1];
    const op = match[2];
    const id2 = match[3];
    
    // Verificar se o operador é válido
    const validOps = ['<', '>', '<=', '>=', '==', '!='];
    if (!validOps.includes(op)) return false;
    
    // Verificar se os operandos são válidos (ID ou número)
    const isId2Numeric = /^[0-9]+$/.test(id2);
    
    // Assumimos que id1 é um ID válido (isso pode ser verificado em outras partes do código)
    // Se id2 é um número, é válido para operações relacionais
    return true;
  }
} 