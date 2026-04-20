import fs from 'node:fs/promises'
import path from 'node:path'

function parseArgs(argv) {
  const args = {}

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      continue
    }

    const key = token.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = 'true'
      continue
    }

    args[key] = next
    index += 1
  }

  return args
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-'
  }

  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function formatMetricValue(metric, value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-'
  }

  if (metric.unit === 'ms') {
    return `${formatNumber(value, 2)} ms`
  }

  if (metric.unit === 'percent') {
    return `${formatNumber(value * 100, 2)}%`
  }

  if (metric.unit === 'count') {
    return formatNumber(value, 0)
  }

  if (metric.unit === 'rate') {
    return `${formatNumber(value, 2)}/s`
  }

  return formatNumber(value, 2)
}

function formatDelta(metric, currentValue, previousValue) {
  if (currentValue === null || currentValue === undefined || previousValue === null || previousValue === undefined) {
    return '-'
  }

  if (previousValue === 0) {
    return 'n/a'
  }

  const delta = ((currentValue - previousValue) / previousValue) * 100
  const prefix = delta > 0 ? '+' : ''

  if (metric.unit === 'percent') {
    return `${prefix}${formatNumber(delta, 2)}%`
  }

  return `${prefix}${formatNumber(delta, 2)}%`
}

function readMetric(summary, metricName, fieldName) {
  const metric = summary.metrics?.[metricName]
  if (!metric) {
    return null
  }

  if (metric.values?.[fieldName] !== undefined) {
    return metric.values[fieldName]
  }

  if (metric[fieldName] !== undefined) {
    return metric[fieldName]
  }

  return null
}

function buildMetricRows(currentSummary, previousSummary) {
  const metrics = [
    { label: 'HTTP request duration avg', metric: 'http_req_duration', field: 'avg', unit: 'ms' },
    { label: 'HTTP request duration p95', metric: 'http_req_duration', field: 'p(95)', unit: 'ms' },
    { label: 'HTTP request duration max', metric: 'http_req_duration', field: 'max', unit: 'ms' },
    { label: 'HTTP requests count', metric: 'http_reqs', field: 'count', unit: 'count' },
    { label: 'HTTP requests rate', metric: 'http_reqs', field: 'rate', unit: 'rate' },
    { label: 'HTTP request failed rate', metric: 'http_req_failed', field: 'value', unit: 'percent' },
    { label: 'Checks success rate', metric: 'checks', field: 'value', unit: 'percent' },
  ]

  return metrics.map((metric) => {
    const currentValue = readMetric(currentSummary, metric.metric, metric.field)
    const previousValue = previousSummary ? readMetric(previousSummary, metric.metric, metric.field) : null

    return {
      ...metric,
      currentValue,
      previousValue,
      currentDisplay: formatMetricValue(metric, currentValue),
      previousDisplay: previousSummary ? formatMetricValue(metric, previousValue) : '-',
      deltaDisplay: previousSummary ? formatDelta(metric, currentValue, previousValue) : '-',
    }
  })
}

function buildMarkdown({
  title,
  currentLabel,
  currentPath,
  previousLabel,
  previousPath,
  rows,
}) {
  const lines = [
    `# ${title}`,
    '',
    `- Generated at: ${new Date().toISOString()}`,
    `- Current summary: \`${currentPath}\``,
  ]

  if (previousPath) {
    lines.push(`- Baseline summary: \`${previousPath}\``)
  }

  lines.push('', '## Metrics', '')

  if (previousPath) {
    lines.push(`| Metric | ${previousLabel} | ${currentLabel} | Delta |`)
    lines.push('| --- | --- | --- | --- |')
    for (const row of rows) {
      lines.push(`| ${row.label} | ${row.previousDisplay} | ${row.currentDisplay} | ${row.deltaDisplay} |`)
    }
  } else {
    lines.push(`| Metric | ${currentLabel} |`)
    lines.push('| --- | --- |')
    for (const row of rows) {
      lines.push(`| ${row.label} | ${row.currentDisplay} |`)
    }
  }

  lines.push('', '## Notes', '')
  if (previousPath) {
    lines.push(`- Baseline label: \`${previousLabel}\``)
    lines.push(`- Current label: \`${currentLabel}\``)
  } else {
    lines.push('- Baseline summary was not provided, so this report contains the current run only.')
    lines.push(`- Current label: \`${currentLabel}\``)
  }

  return `${lines.join('\n')}\n`
}

function buildHtml({
  title,
  currentLabel,
  currentPath,
  previousLabel,
  previousPath,
  rows,
}) {
  const headerCells = previousPath
    ? `<tr><th>Metric</th><th>${previousLabel}</th><th>${currentLabel}</th><th>Delta</th></tr>`
    : `<tr><th>Metric</th><th>${currentLabel}</th></tr>`

  const bodyRows = rows.map((row) => {
    if (previousPath) {
      return `<tr><td>${row.label}</td><td>${row.previousDisplay}</td><td>${row.currentDisplay}</td><td>${row.deltaDisplay}</td></tr>`
    }

    return `<tr><td>${row.label}</td><td>${row.currentDisplay}</td></tr>`
  }).join('\n')

  const notes = previousPath
    ? `<li>Baseline summary: <code>${previousPath}</code></li>
<li>Current summary: <code>${currentPath}</code></li>
<li>Baseline label: <code>${previousLabel}</code></li>
<li>Current label: <code>${currentLabel}</code></li>`
    : `<li>Current summary: <code>${currentPath}</code></li>
<li>Current label: <code>${currentLabel}</code></li>
<li>Baseline summary was not provided, so this report contains the current run only.</li>`

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 40px; color: #1f2937; }
    h1, h2 { margin-bottom: 12px; }
    table { border-collapse: collapse; width: 100%; margin-top: 16px; }
    th, td { border: 1px solid #d1d5db; padding: 10px 12px; text-align: left; }
    th { background: #f3f4f6; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generated at: ${new Date().toISOString()}</p>
  <h2>Metrics</h2>
  <table>
    <thead>
      ${headerCells}
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>
  <h2>Notes</h2>
  <ul>
    ${notes}
  </ul>
</body>
</html>
`
}

async function loadJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  return JSON.parse(content)
}

async function ensureParent(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const currentPath = args.current
  const currentLabel = args['current-label'] || 'current'
  const previousPath = args.previous
  const previousLabel = args['previous-label'] || 'baseline'
  const outputMd = args['output-md']
  const outputHtml = args['output-html']
  const title = args.title || 'Rankings Benchmark Report'

  if (!currentPath || !outputMd) {
    throw new Error('Required arguments: --current <path> --output-md <path>')
  }

  const currentSummary = await loadJson(currentPath)
  const previousSummary = previousPath ? await loadJson(previousPath) : null
  const rows = buildMetricRows(currentSummary, previousSummary)

  const markdown = buildMarkdown({
    title,
    currentLabel,
    currentPath,
    previousLabel,
    previousPath,
    rows,
  })

  await ensureParent(outputMd)
  await fs.writeFile(outputMd, markdown, 'utf8')

  if (outputHtml) {
    const html = buildHtml({
      title,
      currentLabel,
      currentPath,
      previousLabel,
      previousPath,
      rows,
    })

    await ensureParent(outputHtml)
    await fs.writeFile(outputHtml, html, 'utf8')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
