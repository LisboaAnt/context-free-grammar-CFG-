/**
 * Funções para exibição de resultados
 */

/**
 * Exibe os resultados da análise
 */
function displayResults(strings) {
  var tbody = $('#results');
  
  // Limpar todas as árvores existentes
  $('.tree-container').empty().removeClass('tree-generated');
  
  // Mapa para armazenar dados da árvore para cada teste
  window.treeDataMap = window.treeDataMap || {};
  
  for (var i = 0; i < strings.length; i++) {
    var str = strings[i].trim();
    if (str === '') continue;
    
    var cachedResult = parserCache.results.get(str);
    if (!cachedResult) continue;
    
    var isMatch = cachedResult.accepted;
    var isComplete = cachedResult.complete !== false; // Considera true se não estiver definido
    
    // Criar ID único para a linha
    var rowId = 'string-' + i;
    
    // Organizar passos de derivação em uma sequência lógica
    var derivationSteps = [];
    if (cachedResult.derivation && cachedResult.derivation.length > 0) {
      // Copiar array original para não modificá-lo
      derivationSteps = cachedResult.derivation.slice();
      
      // Organizar os passos para seguir uma sequência lógica top-down
      organizarSequenciaDerivacao(derivationSteps);
    }
    
    // Armazenar dados de derivação para esta string específica
    window.treeDataMap[rowId] = {
      derivation: derivationSteps,
      string: str
    };
    
    // Verificar se a linha já existe
    if ($('#' + rowId).length > 0) continue;
    
    // Adicionar linha de resultado
    var escapedStr = escapeHTML(str);
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
        'id': rowId + '-derivation',
        'style': 'display: none;',
        'data-string': str
      });
      
      var derivationCell = $('<td/>', {
        'colspan': 4,
        'style': 'padding: 0;'
      });
      
      // Adicionar botões de visualização
      var visualizationButtons = $('<div/>', {
        'class': 'btn-group btn-group-sm',
        'style': 'margin: 10px; display: flex;'
      });
      
      var tableViewBtn = $('<button/>', {
        'type': 'button',
        'class': 'btn btn-primary active',
        'data-view': 'table',
        'html': '<i class="glyphicon glyphicon-list"></i> Visualização em Tabela'
      });
      
      var treeViewBtn = $('<button/>', {
        'type': 'button',
        'class': 'btn btn-default',
        'data-view': 'tree',
        'data-row-id': rowId,
        'html': '<i class="glyphicon glyphicon-tree-deciduous"></i> Árvore de Derivação'
      });
      
      visualizationButtons.append(tableViewBtn).append(treeViewBtn);
      derivationCell.append(visualizationButtons);
      
      // Container para as visualizações
      var visualizationContainer = $('<div/>', {
        'class': 'visualization-container',
        'style': 'padding: 10px; border-top: 1px solid #ddd;'
      });
      
      // Visualização em tabela (mostrada por padrão)
      var tableView = $('<div/>', {
        'class': 'table-view',
        'data-view': 'table'
      });
      
      // Criar tabela de derivação
      var derivationTable = $('<table/>', {
        'class': 'derivation-table table table-bordered'
      });
      
      // Cabeçalho da tabela de derivação
      var thead = $('<thead/>').append(
        $('<tr/>').append(
          $('<th/>', {'html': 'Passo', 'style': 'width: 10%;'}),
          $('<th/>', {'html': 'Regra', 'style': 'width: 35%;'}),
          $('<th/>', {'html': 'Aplicação', 'style': 'width: 25%;'}),
          $('<th/>', {'html': 'Resultado', 'style': 'width: 30%;'})
        )
      );
      derivationTable.append(thead);
      
      // Corpo da tabela com as derivações
      var derivationBody = $('<tbody/>');
      if (derivationSteps && derivationSteps.length > 0) {
        // Inicializar caminho da derivação
        var caminhoDerivacao = [];
        
        for (var j = 0; j < derivationSteps.length; j++) {
          var step = derivationSteps[j];
          
          // Rastrear caminho da derivação
          if (step.application && !step.application.includes('Tempo limite') && step.rule !== "Final") {
            if (!caminhoDerivacao.includes(step.application)) {
              caminhoDerivacao.push(step.application);
            }
          }
          
          // Determinar classe para destacar passos importantes
          var rowClass = '';
          if (step.rule === "Final") {
            rowClass = 'success';
          } else if (step.rule && (step.rule.includes('...') || step.rule.includes('Timeout'))) {
            rowClass = 'warning';
          } else if (step.rule === "Terminal match") {
            rowClass = 'info';
          }
          
          derivationBody.append(
            $('<tr/>', {'class': rowClass}).append(
              $('<td/>', {'html': (j + 1), 'style': 'padding: 3px 5px; text-align: center;'}),
              $('<td/>', {'html': escapeHTML(step.rule), 'style': 'padding: 3px 5px;'}),
              $('<td/>', {'html': escapeHTML(step.application), 'style': 'padding: 3px 5px;'}),
              $('<td/>', {'html': escapeHTML(step.result), 'style': 'padding: 3px 5px;'})
            )
          );
        }
        
        // Adicionar resumo do caminho de derivação
        if (caminhoDerivacao.length > 0) {
          derivationBody.append(
            $('<tr/>', {'class': 'active'}).append(
              $('<td/>', {'colspan': 4, 'style': 'padding: 3px 5px;'}).append(
                $('<strong/>', {'html': 'Caminho de derivação: '}),
                $('<span/>', {'html': caminhoDerivacao.join(' → '), 'style': 'font-family: monospace;'})
              )
            )
          );
        }
      } else {
        derivationBody.append(
          $('<tr/>').append(
            $('<td/>', {'colspan': 4, 'html': 'Derivação não disponível ou usando algoritmo otimizado.', 'style': 'padding: 3px 5px; text-align: center;'})
          )
        );
      }
      derivationTable.append(derivationBody);
      tableView.append(derivationTable);
      
      // Adicionar metadados sobre a derivação
      if (derivationSteps && derivationSteps.length > 0) {
        var metadataBox = $('<div/>', {
          'class': 'alert alert-info',
          'style': 'margin-top: 10px; font-size: 13px;'
        }).append(
          $('<p/>', {'html': '<strong>Número de passos:</strong> ' + derivationSteps.length}),
          $('<p/>', {'html': '<strong>Estrutura:</strong> A tabela mostra a sequência de derivação desde o símbolo inicial até a string final.'})
        );
        tableView.append(metadataBox);
      }
      
      // Visualização em árvore (oculta inicialmente)
      var treeView = $('<div/>', {
        'class': 'tree-view',
        'data-view': 'tree',
        'style': 'display: none;'
      });
      
      // Container para a árvore - Cada container tem um ID único
      var treeContainer = $('<div/>', {
        'id': 'tree-' + rowId,
        'class': 'tree-container',
        'data-string': str, // Armazenar a string associada
        'style': 'height: 400px; border: 1px solid #ddd; border-radius: 4px; overflow: auto; position: relative;'
      });
      
      // Mensagem de carregamento da árvore
      var loadingMsg = $('<div/>', {
        'class': 'loading-tree',
        'style': 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);',
        'html': '<i class="glyphicon glyphicon-refresh" style="animation: spin 2s linear infinite;"></i> Gerando árvore de derivação...'
      });
      
      // Estilo para animação de rotação
      var spinStyle = $('<style/>').text('@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }');
      $('head').append(spinStyle);
      
      treeContainer.append(loadingMsg);
      treeView.append(treeContainer);
      
      // Instruções para uso da árvore
      var treeInstructions = $('<div/>', {
        'class': 'alert alert-info',
        'style': 'margin-top: 10px;',
        'html': '<strong>Dica:</strong> Clique nos nós para expandir/colapsar ramos da árvore.'
      });
      
      treeView.append(treeInstructions);
      
      // Adicionar as visualizações ao container
      visualizationContainer.append(tableView).append(treeView);
      derivationCell.append(visualizationContainer);
      
      // Adicionar eventos aos botões de visualização
      tableViewBtn.click(function() {
        var $this = $(this);
        var rowId = $this.closest('.derivation-row').attr('id');
        var view = $this.data('view');
        
        // Ativar botão atual e desativar os outros
        $this.addClass('active').removeClass('btn-default').addClass('btn-primary')
          .siblings().removeClass('active').removeClass('btn-primary').addClass('btn-default');
        
        // Mostrar visualização atual e ocultar as outras
        $('#' + rowId + ' .visualization-container [data-view="' + view + '"]').show()
          .siblings('[data-view]').hide();
      });
      
      treeViewBtn.click(function() {
        var $this = $(this);
        var rowId = $this.data('row-id') || $this.closest('.derivation-row').attr('id').replace('-derivation', '');
        var treeContainerId = 'tree-' + rowId;
        var treeContainer = $('#' + treeContainerId);
        var view = $this.data('view');
        
        // Obter os dados específicos para esta árvore
        var treeData = window.treeDataMap[rowId] || {};
        var derivation = treeData.derivation || [];
        var str = treeData.string || '';
        
        // Ativar botão atual e desativar os outros
        $this.addClass('active').removeClass('btn-default').addClass('btn-primary')
          .siblings().removeClass('active').removeClass('btn-primary').addClass('btn-default');
        
        // Mostrar visualização atual e ocultar as outras
        $('#' + rowId + '-derivation .visualization-container [data-view="' + view + '"]').show()
          .siblings('[data-view]').hide();
        
        // Sempre regenerar a árvore quando o botão é clicado para garantir uma visualização correta
        if (derivation && derivation.length > 0) {
          // Limpar o container e remover a classe antes de regenerar
          treeContainer.empty().removeClass('tree-generated');
          
          // Adicionar mensagem de carregamento
          var loadingMsg = $('<div/>', {
            'class': 'loading-tree',
            'style': 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);',
            'html': '<i class="glyphicon glyphicon-refresh" style="animation: spin 2s linear infinite;"></i> Gerando árvore de derivação...'
          });
          treeContainer.append(loadingMsg);
          
          // Regenerar a árvore com um pequeno atraso para permitir a renderização da UI
          setTimeout(function() {
            generateDerivationTree(rowId, derivation, str);
          }, 50);
        }
      });
      
      derivationRow.append(derivationCell);
      tbody.append(derivationRow);
      
      // Adicionar evento de clique para mostrar/ocultar a derivação
      row.click(function() {
        var index = $(this).data('index');
        var rowId = $(this).attr('id');
        var derivationRow = $('#' + rowId + '-derivation');
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
}

/**
 * Função para organizar os passos de derivação em uma sequência lógica
 * Esta função reordena os passos para seguir uma sequência top-down mais clara
 */
function organizarSequenciaDerivacao(derivationSteps) {
  if (!derivationSteps || derivationSteps.length <= 2) return;
  
  // Filtrar passos com "..." na regra - remover passos genéricos/intermediários
  var filteredSteps = derivationSteps.filter(function(step) {
    // Remover passos com "..." que não fornecem informações completas
    return !(step.rule && step.rule.includes('...'));
  });
  
  // Se depois da filtragem restarem poucos passos, manter o original
  if (filteredSteps.length < 3) {
    console.log("Poucos passos restantes após filtragem, mantendo passos originais");
    // Não modificar o array original
    return;
  }
  
  // Substituir o array original pelos passos filtrados
  derivationSteps.length = 0;
  for (var i = 0; i < filteredSteps.length; i++) {
    derivationSteps.push(filteredSteps[i]);
  }
  
  // Remover passo Final se existir (será adicionado no final)
  var finalStep = null;
  for (var i = 0; i < derivationSteps.length; i++) {
    if (derivationSteps[i].rule === "Final") {
      finalStep = derivationSteps.splice(i, 1)[0];
      break;
    }
  }
  
  // Mapear os passos por aplicação para facilitar a busca
  var passosPorAplicacao = {};
  for (var i = 0; i < derivationSteps.length; i++) {
    var step = derivationSteps[i];
    if (step.application) {
      if (!passosPorAplicacao[step.application]) {
        passosPorAplicacao[step.application] = [];
      }
      passosPorAplicacao[step.application].push(step);
    }
  }
  
  // Função para determinar o nível de um símbolo na hierarquia da gramática
  function nivelNaHierarquia(simbolo) {
    var niveis = {
      'Start': 0,
      'S': 1,
      'PROGRAMA': 2,
      'LISTACOMANDOS': 3,
      'COMANDO': 4,
      'EXPRESSAO': 5,
      'BLOCO': 5,
      'CONDICIONAL': 5,
      'REPETICAO': 5,
      'VARIAVEL': 6,
      'ATRIBUICAO': 6,
      'EXPRELACIONAL': 7,
      'EXPARITMETICA': 8,
      'TERMO': 9,
      'FATOR': 10,
      'ID': 11,
      'TIPO': 11,
      'OPREL': 11,
      'OPADD': 12,
      'OPMUL': 12
    };
    
    return niveis[simbolo] !== undefined ? niveis[simbolo] : 99; // Símbolos desconhecidos têm nível alto
  }
  
  // Ordenar os passos por nível hierárquico e ordem de aparição
  derivationSteps.sort(function(a, b) {
    // Primeiro critério: nível na hierarquia da gramática
    var nivelA = nivelNaHierarquia(a.application);
    var nivelB = nivelNaHierarquia(b.application);
    
    if (nivelA !== nivelB) {
      return nivelA - nivelB; // Ordem crescente de nível (do mais geral para o mais específico)
    }
    
    // Segundo critério: manter a ordem original para símbolos do mesmo nível
    return derivationSteps.indexOf(a) - derivationSteps.indexOf(b);
  });
  
  // Agrupar passos relacionados (mesmo símbolo não-terminal)
  var resultado = [];
  var simbolosProcessados = new Set();
  
  // Primeiro o passo inicial
  for (var i = 0; i < derivationSteps.length; i++) {
    if (derivationSteps[i].application === 'Start' || derivationSteps[i].application === 'S') {
      resultado.push(derivationSteps[i]);
      simbolosProcessados.add(derivationSteps[i].application);
      break;
    }
  }
  
  // Função recursiva para adicionar símbolos na ordem correta
  function adicionarPorDependencia(simbolo) {
    if (simbolosProcessados.has(simbolo)) return;
    simbolosProcessados.add(simbolo);
    
    // Adicionar todos os passos para este símbolo
    var passos = passosPorAplicacao[simbolo] || [];
    for (var i = 0; i < passos.length; i++) {
      resultado.push(passos[i]);
      
      // Processar símbolos resultantes
      if (passos[i].result) {
        var simbolosResultantes = passos[i].result.split(/\s+/).filter(Boolean);
        for (var j = 0; j < simbolosResultantes.length; j++) {
          if (passosPorAplicacao[simbolosResultantes[j]]) {
            adicionarPorDependencia(simbolosResultantes[j]);
          }
        }
      }
    }
  }
  
  // Iniciar com o símbolo inicial (geralmente S ou PROGRAMA)
  var simboloInicial = derivationSteps[0].result;
  adicionarPorDependencia(simboloInicial);
  
  // Adicionar símbolos restantes que não foram processados
  for (var i = 0; i < derivationSteps.length; i++) {
    if (!simbolosProcessados.has(derivationSteps[i].application)) {
      resultado.push(derivationSteps[i]);
      simbolosProcessados.add(derivationSteps[i].application);
    }
  }
  
  // Adicionar terminal matches no final
  for (var i = 0; i < derivationSteps.length; i++) {
    if (derivationSteps[i].rule === "Terminal match" && !resultado.includes(derivationSteps[i])) {
      resultado.push(derivationSteps[i]);
    }
  }
  
  // Adicionar o passo Final no final, se existir
  if (finalStep) {
    resultado.push(finalStep);
  }
  
  // Substituir o array original pelos passos ordenados
  derivationSteps.length = 0;
  for (var i = 0; i < resultado.length; i++) {
    derivationSteps.push(resultado[i]);
  }
  
  // Numerar os passos para facilitar referência
  for (var i = 0; i < derivationSteps.length; i++) {
    derivationSteps[i].passo = i + 1;
  }
} 