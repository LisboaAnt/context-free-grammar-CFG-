/**
 * Função auxiliar para escapar HTML e prevenir XSS
 */
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Funções para visualização da árvore de derivação
 */

/**
 * Gera a árvore de derivação para uma entrada específica
 */
function generateDerivationTree(rowId, derivationSteps, originalString) {
  var treeContainer = $('#tree-' + rowId);
  
  // Garantir que o container esteja limpo antes de começar
  treeContainer.empty();
  
  // Limpar qualquer estado salvo no SVG
  d3.select('#tree-' + rowId + ' svg').remove();
  
  // Marcar que a árvore está sendo gerada
  treeContainer.addClass('tree-generated')
    .attr('data-string', originalString) // Armazenar a string como atributo para referência
    .attr('data-timestamp', new Date().getTime()); // Adicionar timestamp para tornar cada geração única
  
  // Adicionar uma mensagem de carregamento
  var loadingMsg = $('<div/>', {
    'class': 'loading-tree',
    'style': 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);',
    'html': '<i class="glyphicon glyphicon-refresh" style="animation: spin 2s linear infinite;"></i> Gerando árvore de derivação...'
  });
  treeContainer.append(loadingMsg);
  
  // Carregar dependências necessárias
  loadDependencies(function() {
    // Construir a estrutura da árvore a partir dos passos de derivação
    var treeData = buildDerivationTree(derivationSteps, originalString);
    
    // Remover mensagem de carregamento
    treeContainer.find('.loading-tree').remove();
    
    // Adicionar identificador único para esta árvore específica
    treeContainer.attr('data-tree-id', 'tree-' + rowId + '-' + new Date().getTime());
    
    // Renderizar a árvore
    renderDerivationTree(treeContainer[0], treeData);
    
    // Adicionar indicador da string que esta árvore representa
    var stringIndicator = $('<div/>', {
      'class': 'tree-string-indicator',
      'style': 'position: absolute; top: 5px; left: 5px; font-size: 12px; color: #666; background: rgba(255,255,255,0.8); padding: 2px 5px; border-radius: 3px;',
      'html': 'Árvore para: "' + escapeHTML(originalString) + '"'
    });
    treeContainer.append(stringIndicator);
  });
}

/**
 * Carrega as dependências necessárias para a visualização da árvore
 */
function loadDependencies(callback) {
  // Verificar se D3.js já está carregado
  if (typeof d3 !== 'undefined') {
    callback();
    return;
  }
  
  // Carregar D3.js
  var d3Script = document.createElement('script');
  d3Script.src = 'https://d3js.org/d3.v5.min.js';
  d3Script.onload = function() {
    callback();
  };
  document.head.appendChild(d3Script);
}

/**
 * Constrói a estrutura de dados da árvore a partir dos passos de derivação
 * Nova versão que segue exatamente a sequência de derivações e utiliza
 * a estrutura organizada em sequência lógica com contexto de origem
 */
function buildDerivationTree(derivationSteps, originalString) {
  // Filtrar passos irrelevantes e passos com "..."
  var relevantSteps = derivationSteps.filter(function(step) {
    return step.rule && 
           step.rule !== "Final" && 
           !step.rule.includes('...') && // Excluir passos com "..."
           step.application && 
           step.result;
  });
  
  console.log("Construindo árvore a partir de", relevantSteps.length, "passos de derivação");
  
  // Encontrar o símbolo inicial (geralmente "Start" ou "S")
  var initialSymbol = relevantSteps.length > 0 ? relevantSteps[0].application : "Start";
  
  // Mapa para armazenar os nós da árvore com contexto único
  var nodeMap = {};
  
  // Criar nó raiz
  var root = {
    name: initialSymbol,
    children: [],
    forceExpanded: true,
    context: "root", // Contexto único para o nó raiz
    stepIndex: 0
  };
  
  nodeMap[initialSymbol + "_root"] = root;
  
  // Criar um mapa de passos organizados por ordem de execução
  var stepsByOrder = {};
  for (var i = 0; i < relevantSteps.length; i++) {
    var step = relevantSteps[i];
    step.orderIndex = i; // Adicionar índice de ordem
    
    // Criar chave única baseada na aplicação e ordem
    var stepKey = step.application + "_" + i;
    stepsByOrder[stepKey] = step;
  }
  
  // Função para criar identificador único baseado no contexto
  function createUniqueId(symbolName, parentContext, stepIndex) {
    return symbolName + "_" + parentContext + "_" + stepIndex;
  }
  
  // Função para encontrar o passo correto para um símbolo em um contexto específico
  function findStepForSymbol(symbolName, contextStepIndex) {
    for (var i = contextStepIndex; i < relevantSteps.length; i++) {
      var step = relevantSteps[i];
      if (step.application === symbolName) {
        return step;
      }
    }
    return null;
  }
  
  // Função recursiva para construir a árvore com contexto
  function buildTreeWithContext(symbolName, parentNode, parentContext, currentStepIndex) {
    // Criar identificador único para este nó
    var nodeId = createUniqueId(symbolName, parentContext, currentStepIndex);
    
    // Verificar se já processamos este nó específico
    if (nodeMap[nodeId]) {
      return nodeMap[nodeId];
    }
    
    // Encontrar o passo de derivação correto para este símbolo
    var step = findStepForSymbol(symbolName, currentStepIndex);
    
    if (!step) {
      // Se não encontrou passo, é um terminal
      var terminalNode = {
        name: symbolName,
        isTerminal: true,
        forceExpanded: false,
        context: parentContext,
        stepIndex: currentStepIndex
      };
      
      nodeMap[nodeId] = terminalNode;
      return terminalNode;
    }
    
    // Criar nó não-terminal
    var node = {
      name: symbolName,
      children: [],
      forceExpanded: true,
      context: parentContext + "_" + symbolName,
      stepIndex: step.orderIndex,
      rule: step.rule
    };
    
    nodeMap[nodeId] = node;
    
    // Processar os símbolos resultantes
    if (step.result) {
      var resultSymbols = step.result.split(/\s+/).filter(Boolean);
      
      for (var i = 0; i < resultSymbols.length; i++) {
        var symbol = resultSymbols[i];
        
        // Verificar se é terminal ou não-terminal
        var isTerminal = !symbol.match(/^[A-Z][A-Z0-9_]*$/);
        
        if (isTerminal) {
          // Criar nó terminal diretamente
          var terminalChild = {
            name: symbol,
            isTerminal: true,
            forceExpanded: false,
            context: node.context,
            stepIndex: step.orderIndex
          };
          node.children.push(terminalChild);
        } else {
          // Criar nó não-terminal recursivamente
          var childNode = buildTreeWithContext(
            symbol, 
            node, 
            node.context, 
            step.orderIndex + 1
          );
          
          if (childNode) {
            node.children.push(childNode);
          }
        }
      }
    }
    
    return node;
  }
  
  // Construir a árvore começando pelo símbolo inicial
  var finalRoot = buildTreeWithContext(initialSymbol, null, "root", 0);
  
  // Se não conseguiu construir a árvore, usar uma versão simplificada
  if (!finalRoot || !finalRoot.children || finalRoot.children.length === 0) {
    console.log("Construção com contexto falhou, usando método simplificado");
    return buildSimpleTree(relevantSteps, initialSymbol);
  }
  
  // Adicionar destaque visual a nós importantes
  highlightImportantNodes(finalRoot);
  
  // Verificar se a árvore precisa de pós-processamento
  postProcessTree(finalRoot);
  
  return finalRoot;
}

/**
 * Método simplificado para construir árvore quando o método com contexto falha
 */
function buildSimpleTree(relevantSteps, initialSymbol) {
  var root = {
    name: initialSymbol,
    children: [],
    forceExpanded: true
  };
  
  // Mapear passos por aplicação
  var stepsByApplication = {};
  for (var i = 0; i < relevantSteps.length; i++) {
    var step = relevantSteps[i];
    if (!stepsByApplication[step.application]) {
      stepsByApplication[step.application] = [];
    }
    stepsByApplication[step.application].push(step);
  }
  
  // Função recursiva simples
  function buildSimpleRecursive(symbolName, parentNode, processedSymbols) {
    if (processedSymbols.has(symbolName)) return;
    processedSymbols.add(symbolName);
    
    var steps = stepsByApplication[symbolName] || [];
    
    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      
      if (step.rule === "Terminal match") {
        if (!parentNode.children) parentNode.children = [];
        
        var terminalNode = {
          name: step.result,
          isTerminal: true,
          forceExpanded: false
        };
        
        // Verificar duplicatas
        var exists = parentNode.children.some(function(child) {
          return child.name === step.result;
        });
        
        if (!exists) {
          parentNode.children.push(terminalNode);
        }
        continue;
      }
      
      if (step.result) {
        var resultSymbols = step.result.split(/\s+/).filter(Boolean);
        
        for (var j = 0; j < resultSymbols.length; j++) {
          var symbol = resultSymbols[j];
          var isTerminal = !symbol.match(/^[A-Z][A-Z0-9_]*$/);
          
          if (!parentNode.children) parentNode.children = [];
          
          // Verificar se já existe
          var existingChild = parentNode.children.find(function(child) {
            return child.name === symbol;
          });
          
          if (existingChild) {
            if (!isTerminal) {
              buildSimpleRecursive(symbol, existingChild, new Set(processedSymbols));
            }
            continue;
          }
          
          var childNode = {
            name: symbol,
            rule: step.rule,
            forceExpanded: !isTerminal
          };
          
          if (isTerminal) {
            childNode.isTerminal = true;
          } else {
            childNode.children = [];
          }
          
          parentNode.children.push(childNode);
          
          if (!isTerminal) {
            buildSimpleRecursive(symbol, childNode, new Set(processedSymbols));
          }
        }
      }
    }
  }
  
  buildSimpleRecursive(initialSymbol, root, new Set());
  return root;
}

/**
 * Função para pós-processar a árvore e garantir que tudo esteja consistente
 */
function postProcessTree(root) {
  if (!root) return;
  
  // Verificar se faltam nós operadores como "=", ">", etc.
  function addMissingOperators(node) {
    if (!node) return;
    
    // Verificar nós especiais que normalmente contêm operadores
    if (node.name === "OPREL" && (!node.children || node.children.length === 0)) {
      node.children = [{name: "op", isTerminal: true}];
    }
    if (node.name === "OPADD" && (!node.children || node.children.length === 0)) {
      node.children = [{name: "+", isTerminal: true}];
    }
    if (node.name === "OPMUL" && (!node.children || node.children.length === 0)) {
      node.children = [{name: "*", isTerminal: true}];
    }
    
    // Recursão para os filhos
    if (node.children) {
      for (var i = 0; i < node.children.length; i++) {
        addMissingOperators(node.children[i]);
      }
    }
  }
  
  addMissingOperators(root);
}

/**
 * Função auxiliar para destacar nós importantes na árvore
 */
function highlightImportantNodes(node) {
  if (!node) return;
  
  // Lista de nós importantes que devem receber destaque visual
  var importantNodes = ["BLOCO", "COMANDO", "CONDICIONAL", "REPETICAO", "EXPRESSAO", "LISTACOMANDOS"];
  
  // Verificar se o nó atual é importante
  if (importantNodes.includes(node.name)) {
    node.isSpecial = true;
    node.forceExpanded = true;
  }
  
  // Processar recursivamente os filhos
  if (node.children) {
    for (var i = 0; i < node.children.length; i++) {
      highlightImportantNodes(node.children[i]);
    }
  }
}

/**
 * Renderiza a árvore de derivação usando D3.js
 * Modificada para que todos os nós comecem expandidos
 */
function renderDerivationTree(container, data) {
  // Verificar se o container é válido
  if (!container) {
    console.error("Container inválido para renderização da árvore");
    return;
  }
  
  // Criar um ID único para esta árvore
  var treeId = "tree-" + (container.id || "unknown") + "-" + new Date().getTime();
  container.setAttribute("data-render-id", treeId);
  
  // Limpar o container
  d3.select(container).html('');
  
  // Dimensões do container
  var width = container.clientWidth || 800;
  var height = container.clientHeight || 400;
  
  // Definir margens
  var margin = {top: 20, right: 20, bottom: 20, left: 20};
  var innerWidth = width - margin.left - margin.right;
  var innerHeight = height - margin.top - margin.bottom;
  
  // Criar SVG com ID único
  var svg = d3.select(container).append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('id', "svg-" + treeId)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
  
  // Hierarquia D3
  var root = d3.hierarchy(data);
  
  // Garantir que todos os nós estão expandidos inicialmente
  expandAllNodes(root);
  
  // Garantir que nós importantes estão sempre expandidos
  forceExpandSpecificNodes(root);
  
  // Calcular profundidade total da árvore
  var maxDepth = 0;
  root.eachBefore(function(d) {
    maxDepth = Math.max(maxDepth, d.depth);
  });
  
  // Definir layout da árvore
  var treeLayout = d3.tree()
    .size([innerWidth, innerHeight - 50]);
  
  // Calcular layout
  treeLayout(root);
  
  // Adicionar links
  svg.selectAll('.link-' + treeId)
    .data(root.links())
    .enter()
    .append('path')
    .attr('class', 'link link-' + treeId)
    .attr('d', d3.linkVertical()
      .x(function(d) { return d.x; })
      .y(function(d) { return d.y; }))
    .style('fill', 'none')
    .style('stroke', '#555')
    .style('stroke-width', '1.5px');
  
  // Adicionar nós
  var node = svg.selectAll('.node-' + treeId)
    .data(root.descendants())
    .enter()
    .append('g')
    .attr('class', function(d) { 
      return 'node node-' + treeId + (d.children ? ' node--internal' : ' node--leaf'); 
    })
    .attr('transform', function(d) { 
      return 'translate(' + d.x + ',' + d.y + ')'; 
    })
    .attr('data-node-id', function(d, i) {
      return treeId + '-node-' + i; // ID único para cada nó
    })
    .on('click', function(d) {
      // Se for um nó que deve permanecer expandido, impedir colapso
      if (d.data.forceExpanded && d.children) {
        console.log("Tentativa de colapsar nó forçadamente expandido: " + d.data.name);
        return; // Impedir colapso
      }
      
      // Toggle para mostrar/ocultar filhos
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
      update(root);
    });
  
  // Adicionar círculos aos nós
  node.append('circle')
    .attr('r', 5)
    .style('fill', function(d) { 
      if (d.data.isSpecial) return '#1976D2'; // Azul mais forte para nós especiais
      return d.data.isTerminal ? '#4CAF50' : '#2196F3';  // Verde para terminais, Azul para não-terminais
    })
    .style('stroke', function(d) {
      if (d.data.isSpecial) return '#0D47A1'; // Borda azul escura para nós especiais
      return d.data.isTerminal ? '#2E7D32' : '#1565C0';
    })
    .style('stroke-width', function(d) {
      return d.data.isSpecial ? '2px' : '1.5px'; // Borda mais grossa para nós especiais
    });
  
  // Adicionar rótulos aos nós
  node.append('text')
    .attr('dy', '0.31em')
    .attr('x', function(d) { 
      return d.children ? -8 : 8; 
    })
    .style('text-anchor', function(d) { 
      return d.children ? 'end' : 'start'; 
    })
    .text(function(d) { return d.data.name; })
    .style('font-size', '12px')
    .style('font-weight', function(d) {
      return d.data.isSpecial ? 'bold' : 'normal'; // Texto em negrito para nós especiais
    })
    .style('fill', '#333');
  
  // Contador para IDs únicos - específico para esta árvore
  var idCounter = 0;
  
  // Função auxiliar para expandir todos os nós
  function expandAllNodes(node) {
    if (node) {
      node._children = null; // Limpar qualquer estado salvo de nós colapsados
      if (node.children) {
        node.children.forEach(expandAllNodes);
      }
    }
  }
  
  // Função para garantir que nós específicos estejam sempre expandidos
  function forceExpandSpecificNodes(node) {
    if (!node) return;
    
    // Processar recursivamente toda a árvore
    function processNode(n) {
      if (n.data && n.data.forceExpanded) {
        // Garantir que o nó está expandido
        if (n._children) {
          n.children = n._children;
          n._children = null;
        }
      }
      
      if (n.children) {
        n.children.forEach(processNode);
      }
    }
    
    processNode(node);
  }
  
  // Função para atualizar a árvore
  function update(source) {
    // Garantir que nós específicos permaneçam expandidos
    forceExpandSpecificNodes(root);
    
    // Recalcular layout
    treeLayout(root);
    
    // Atualizar nós
    var nodes = svg.selectAll('.node-' + treeId)
      .data(root.descendants(), function(d) { return d.id || (d.id = ++idCounter); });
    
    // Remover nós que não existem mais
    nodes.exit().remove();
    
    // Transição para os nós existentes
    var nodeUpdate = nodes.transition()
      .duration(500)
      .attr('transform', function(d) { 
        return 'translate(' + d.x + ',' + d.y + ')'; 
      });
    
    // Atualizar aparência dos nós
    nodeUpdate.select('circle')
      .style('fill', function(d) { 
        if (d.data.isSpecial) return '#1976D2'; // Consistência para nós especiais
        return d.data.isTerminal ? '#4CAF50' : '#2196F3';  // Consistência com as cores acima
      });
    
    // Atualizar posição dos rótulos
    nodeUpdate.select('text')
      .attr('x', function(d) { 
        return d.children ? -8 : 8; 
      })
      .style('text-anchor', function(d) { 
        return d.children ? 'end' : 'start'; 
      });
    
    // Atualizar links
    var links = svg.selectAll('.link-' + treeId)
      .data(root.links(), function(d) { return d.source.id + '-' + d.target.id; });
    
    // Remover links que não existem mais
    links.exit().remove();
    
    // Atualizar links existentes
    links.transition()
      .duration(500)
      .attr('d', d3.linkVertical()
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; }));
  }
}

/**
 * Força a expansão de todos os nós da árvore em um container específico
 */
function forceExpandTree(containerId, derivationSteps, originalString) {
  var container = document.getElementById(containerId);
  if (!container) {
    console.warn("Container não encontrado: " + containerId);
    return;
  }
  
  console.log("Forçando expansão da árvore para:", originalString);
  
  // Limpar o container antes de reconstruir
  d3.select('#' + containerId).html('');
  
  // Reconstruir e renderizar a árvore com todos os nós expandidos
  var treeData = buildDerivationTree(derivationSteps, originalString);
  
  // Garantir que todos os nós não-terminais estão marcados para forçar expansão
  function markAllForceExpanded(node) {
    if (!node) return;
    
    // Se não for terminal, forçar expansão
    if (!node.isTerminal) {
      node.forceExpanded = true;
    }
    
    // Processar filhos recursivamente
    if (node.children) {
      for (var i = 0; i < node.children.length; i++) {
        markAllForceExpanded(node.children[i]);
      }
    }
  }
  
  // Marcar todos os nós não-terminais como forçadamente expandidos
  markAllForceExpanded(treeData);
  
  // Renderizar a árvore totalmente expandida
  renderDerivationTree(container, treeData);
} 