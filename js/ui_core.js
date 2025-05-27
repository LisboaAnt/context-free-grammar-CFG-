/**
 * Funções principais de interface do usuário
 */

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
  
  // Adicionar opções de algoritmos na interface
  if (!$('#algorithm-options').length) {
    var optionsDiv = $('<div/>', {
      'id': 'algorithm-options',
      'class': 'panel panel-default'
    });
    
    var optionsHeader = $('<div/>', {
      'class': 'panel-heading',
      'html': '<h4 class="panel-title">Opções de Algoritmo</h4>'
    }).appendTo(optionsDiv);
    
    var optionsBody = $('<div/>', {
      'class': 'panel-body'
    }).appendTo(optionsDiv);
    
    // Opção para usar algoritmo CYK (programação dinâmica)
    var cykDiv = $('<div/>', {
      'class': 'checkbox'
    }).appendTo(optionsBody);
    
    $('<label/>').append(
      $('<input/>', {
        'type': 'checkbox',
        'id': 'use-cyk',
        'checked': false
      }),
      ' Usar algoritmo CYK (programação dinâmica)'
    ).appendTo(cykDiv);
    
    // Opção para usar processamento paralelo
    var parallelDiv = $('<div/>', {
      'class': 'checkbox'
    }).appendTo(optionsBody);
    
    $('<label/>').append(
      $('<input/>', {
        'type': 'checkbox',
        'id': 'use-parallel',
        'checked': false
      }),
      ' Usar processamento paralelo (Web Workers)'
    ).appendTo(parallelDiv);
    
    // Verificar suporte a Web Workers
    if (typeof(Worker) === "undefined") {
      $('#use-parallel').prop('disabled', true);
      $('<p/>', {
        'class': 'text-muted',
        'html': 'Web Workers não são suportados neste navegador.'
      }).appendTo(parallelDiv);
    }
    
    // Adicionar à interface antes do campo de teste
    optionsDiv.insertBefore($('#test-input').parent());
    
    // Evento de alteração nos checkboxes
    $('#use-cyk, #use-parallel').change(function() {
      // Desativar um se o outro estiver ativado
      if (this.id === 'use-cyk' && $(this).is(':checked')) {
        $('#use-parallel').prop('checked', false);
      } else if (this.id === 'use-parallel' && $(this).is(':checked')) {
        $('#use-cyk').prop('checked', false);
      }
      
      // Reprocessar as strings de teste se houver alguma
      if ($('#test-input').val().trim() !== '') {
        testCFG();
      }
    });
  }

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