/*
 * Minimal dependency-free canvas chart renderer: horizontal bar chart and
 * donut chart, styled to match the dashboard's design tokens (see
 * css/styles.css :root variables, mirrored here as PALETTE).
 */
(function (global) {
  'use strict';

  var PALETTE = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#4f46e5'];

  function devicePixelSetup(canvas) {
    var ratio = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var w = rect.width || canvas.clientWidth || 300;
    var h = rect.height || canvas.clientHeight || 200;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx: ctx, width: w, height: h };
  }

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.hasAttribute('data-theme') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function textColor() { return isDark() ? '#e5e7eb' : '#1f2937'; }
  function gridColor() { return isDark() ? '#374151' : '#e5e7eb'; }

  function drawBarChart(canvas, data, options) {
    options = options || {};
    var setup = devicePixelSetup(canvas);
    var ctx = setup.ctx, W = setup.width, H = setup.height;
    ctx.clearRect(0, 0, W, H);

    if (!data.length) {
      ctx.fillStyle = textColor();
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('No data', 10, 20);
      return;
    }

    var maxVal = Math.max.apply(null, data.map(function (d) { return d.value; })) || 1;
    var labelWidth = Math.min(W * 0.38, 170);
    var padding = 10;
    var barAreaWidth = W - labelWidth - padding * 2 - 40;
    var rowHeight = Math.min(28, (H - padding * 2) / data.length);
    var barHeight = Math.max(8, rowHeight * 0.55);

    ctx.font = '12px system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    function truncateToWidth(text, maxWidth) {
      if (ctx.measureText(text).width <= maxWidth) return text;
      var lo = 0, hi = text.length;
      while (lo < hi) {
        var mid = (lo + hi + 1) >> 1;
        var candidate = text.slice(0, mid) + '…';
        if (ctx.measureText(candidate).width <= maxWidth) lo = mid;
        else hi = mid - 1;
      }
      return lo > 0 ? text.slice(0, lo) + '…' : '…';
    }

    data.forEach(function (d, i) {
      var y = padding + i * rowHeight + rowHeight / 2;
      var barW = Math.max(2, (d.value / maxVal) * barAreaWidth);
      var color = d.color || options.color || PALETTE[i % PALETTE.length];

      ctx.fillStyle = textColor();
      ctx.textAlign = 'right';
      var label = truncateToWidth(d.label, labelWidth - 4);
      ctx.fillText(label, labelWidth, y);

      ctx.fillStyle = color;
      var barX = labelWidth + padding;
      roundRect(ctx, barX, y - barHeight / 2, barW, barHeight, 3);
      ctx.fill();

      ctx.fillStyle = textColor();
      ctx.textAlign = 'left';
      ctx.fillText(String(d.value), barX + barW + 6, y);
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2 > 0 ? w / 2 : r);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawDonutChart(canvas, data, options) {
    options = options || {};
    var setup = devicePixelSetup(canvas);
    var ctx = setup.ctx, W = setup.width, H = setup.height;
    ctx.clearRect(0, 0, W, H);

    var total = data.reduce(function (s, d) { return s + d.value; }, 0);
    var cx = W * 0.32, cy = H / 2;
    var radius = Math.min(cx, cy) - 8;
    var innerRadius = radius * 0.6;

    if (!total) {
      ctx.fillStyle = textColor();
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('No data', 10, 20);
      return;
    }

    var start = -Math.PI / 2;
    data.forEach(function (d, i) {
      var angle = (d.value / total) * Math.PI * 2;
      var color = d.color || PALETTE[i % PALETTE.length];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, start + angle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      start += angle;
    });

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = textColor();
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(total), cx, cy);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('total', cx, cy + 14);

    // Legend
    var legendX = cx + radius + 20;
    var legendY = cy - (data.length * 18) / 2;
    ctx.textAlign = 'left';
    ctx.font = '12px system-ui, sans-serif';
    data.forEach(function (d, i) {
      var color = d.color || PALETTE[i % PALETTE.length];
      var y = legendY + i * 18;
      if (legendX + 140 > W) return; // narrow canvas: skip legend, rely on external list
      ctx.fillStyle = color;
      ctx.fillRect(legendX, y - 6, 10, 10);
      ctx.fillStyle = textColor();
      var pct = Math.round((d.value / total) * 100);
      var label = (d.label.length > 18 ? d.label.slice(0, 16) + '…' : d.label) + ' (' + pct + '%)';
      ctx.fillText(label, legendX + 16, y);
    });
  }

  global.MVCharts = {
    PALETTE: PALETTE,
    drawBarChart: drawBarChart,
    drawDonutChart: drawDonutChart
  };
})(typeof window !== 'undefined' ? window : this);
