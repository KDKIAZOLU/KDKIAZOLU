/*
 * Lightweight, dependency-free multi-select dropdown: a button showing a
 * summary ("All Schools" / "3 selected") that opens a checkbox list panel.
 * Used for every Dashboard filter so a case worker can, for example, filter
 * by several schools or several support needs at once instead of just one.
 *
 * Exposes: window.MVMultiSelect.create(containerEl, { placeholder, onChange }) -> {
 *   setOptions([{value,label}]), getSelected(), setSelected([values]), reset()
 * }
 */
(function (global) {
  'use strict';

  function closeAllPanels(except) {
    document.querySelectorAll('.multiselect-panel').forEach(function (p) {
      if (p !== except) p.classList.add('hidden');
    });
  }
  document.addEventListener('click', function () { closeAllPanels(null); });

  function create(container, opts) {
    opts = opts || {};
    var placeholder = opts.placeholder || 'All';
    var onChange = opts.onChange || function () {};
    var items = [];
    var selected = {};

    container.classList.add('multiselect-wrap');
    container.innerHTML = '';

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn multiselect-btn';

    var panel = document.createElement('div');
    panel.className = 'multiselect-panel hidden';

    var controls = document.createElement('div');
    controls.className = 'multiselect-controls';
    var selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.className = 'btn btn-sm';
    selectAllBtn.textContent = 'Select all';
    var clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn btn-sm';
    clearBtn.textContent = 'Clear';
    controls.appendChild(selectAllBtn);
    controls.appendChild(clearBtn);

    var list = document.createElement('div');
    list.className = 'multiselect-list';

    panel.appendChild(controls);
    panel.appendChild(list);
    container.appendChild(button);
    container.appendChild(panel);

    function updateButtonLabel() {
      var n = Object.keys(selected).length;
      button.textContent = (n === 0 ? placeholder : n === 1 ? selectedLabel() : n + ' selected') + ' ▾';
    }
    function selectedLabel() {
      var v = Object.keys(selected)[0];
      var item = items.find(function (it) { return it.value === v; });
      var label = item ? item.label : v;
      return label.length > 22 ? label.slice(0, 20) + '…' : label;
    }

    function getSelected() {
      return items.map(function (it) { return it.value; }).filter(function (v) { return selected[v]; });
    }

    function renderList() {
      list.innerHTML = '';
      if (!items.length) {
        list.appendChild(el('div', { class: 'small muted', style: 'padding:6px;', text: 'No options available.' }));
        return;
      }
      items.forEach(function (it) {
        var label = document.createElement('label');
        label.className = 'multiselect-option';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!selected[it.value];
        cb.addEventListener('change', function () {
          if (cb.checked) selected[it.value] = true; else delete selected[it.value];
          updateButtonLabel();
          onChange(getSelected());
        });
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + it.label));
        list.appendChild(label);
      });
    }

    function el(tag, attrs) {
      var e = document.createElement(tag);
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') e.textContent = attrs[k];
        else e.setAttribute(k, attrs[k]);
      });
      return e;
    }

    selectAllBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      items.forEach(function (it) { selected[it.value] = true; });
      renderList();
      updateButtonLabel();
      onChange(getSelected());
    });
    clearBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      selected = {};
      renderList();
      updateButtonLabel();
      onChange(getSelected());
    });
    button.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = panel.classList.contains('hidden');
      closeAllPanels(null);
      if (willOpen) panel.classList.remove('hidden');
    });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });

    updateButtonLabel();
    renderList();

    return {
      setOptions: function (newItems) {
        items = newItems || [];
        var itemValues = {};
        items.forEach(function (it) { itemValues[it.value] = true; });
        Object.keys(selected).forEach(function (v) { if (!itemValues[v]) delete selected[v]; });
        renderList();
        updateButtonLabel();
      },
      getSelected: getSelected,
      setSelected: function (values) {
        selected = {};
        (values || []).forEach(function (v) { selected[v] = true; });
        renderList();
        updateButtonLabel();
      },
      reset: function () {
        selected = {};
        renderList();
        updateButtonLabel();
      }
    };
  }

  global.MVMultiSelect = { create: create };
})(typeof window !== 'undefined' ? window : this);
