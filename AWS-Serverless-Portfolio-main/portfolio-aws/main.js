// Download/hero button click press effect (dev-test behavior)
;(() => {
  const heroButtons = document.querySelectorAll('.btn.primary')
  if (!heroButtons.length) return

  const triggerPress = (button) => {
    button.classList.remove('clicked')
    void button.offsetWidth
    button.classList.add('clicked')
    window.setTimeout(() => button.classList.remove('clicked'), 300)
  }

  heroButtons.forEach((button) => {
    // Trigger on press-down so it feels immediate like dev-test.
    button.addEventListener('pointerdown', () => {
      button.dataset.justPressed = '1'
      triggerPress(button)
      window.setTimeout(() => {
        delete button.dataset.justPressed
      }, 220)
    })
    // Keep click as fallback for keyboard/programmatic activation.
    button.addEventListener('click', () => {
      if (button.dataset.justPressed === '1') return
      triggerPress(button)
    })
  })
})()

;(() => {
  const host = document.querySelector('.top-profile')
  const canvas = host?.querySelector('[data-matrix-rain]')
  if (!host || !(canvas instanceof HTMLCanvasElement)) return

  const context = canvas.getContext('2d')
  if (!context) return

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const snippets = [
    'aws cloudwatch list-metrics --namespace AWS/EC2 --metric-name CPUUtilization --region us-east-1',
    'aws cloudwatch describe-alarms --state-value ALARM --max-records 20 --region us-east-1',
    'aws cloudwatch get-metric-statistics --namespace AWS/EC2 --metric-name NetworkIn --statistics Average --period 300 --start-time 2026-02-16T00:00:00Z --end-time 2026-02-16T01:00:00Z --region us-east-1',
    'aws cloudwatch get-dashboard --dashboard-name SecurityOpsDashboard --region us-east-1',
    'aws cloudwatch put-metric-alarm --alarm-name RootAccountUsage --metric-name RootAccountUsage --namespace AWS/CloudTrailMetrics --statistic Sum --period 300 --evaluation-periods 1 --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold',
    'aws logs start-query --log-group-name /aws/cloudtrail/logs --start-time 1710000000 --end-time 1710003600 --query-string "fields @timestamp,@message | filter eventName like /AuthorizeSecurityGroup/"',
    'aws logs filter-log-events --log-group-name /aws/cloudtrail/logs --filter-pattern "{ $.eventName = ConsoleLogin }" --limit 25',
    'aws logs describe-metric-filters --log-group-name /aws/cloudtrail/logs',
    'aws cloudtrail describe-trails --include-shadow-trails',
    'aws cloudtrail get-trail-status --name arn:aws:cloudtrail:us-east-1:123456789012:trail/org-trail',
    'aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventSource,AttributeValue=iam.amazonaws.com --max-results 50',
    'aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=StopLogging --max-results 20',
    'ip -br addr show',
    'ip route show table main',
    'ip route get 1.1.1.1',
    'ip -s link show',
    'ip neigh show nud reachable',
    'ip rule show',
    'ss -tulpn | grep -E ":(22|80|443)\\s"',
    'traceroute -n 8.8.8.8',
    'tracepath 1.1.1.1',
    'mtr -rwzbc 15 8.8.4.4',
    'dig +short cloudfront.net',
    'host ec2-54-0-0-1.compute-1.amazonaws.com',
    'journalctl -u ssh --since "15 minutes ago" | grep -Ei "failed|invalid|authentication failure"',
    'for ip in $(awk \'/Failed password/ {print $(NF-3)}\' /var/log/auth.log | sort -u); do echo "$ip"; done',
    'const stream = await cloudwatchClient.send(new GetMetricDataCommand(params));',
    'for (const alarm of alarms) { if (alarm.StateValue !== "OK") notify(alarm) }',
    'export async function handler(event) { return { statusCode: 200, body: JSON.stringify(event) } }',
    'const latencyP95 = metrics.filter(m => m.p95 > threshold).map(m => m.service)',
    'if (packetLoss > 0.01) { throw new Error("network degradation detected") }',
    'def rotate_keys(client): return [k for k in client.list_access_keys()["AccessKeyMetadata"]]',
    'SELECT request_id, status_code, duration_ms FROM api_logs WHERE duration_ms > 500 ORDER BY ts DESC;',
    '2026-02-19T09:00:31Z INFO deploy completed region=us-east-1 service=portfolio-api',
    '2026-02-19T09:00:34Z WARN retrying request id=41b9c timeout_ms=1250 attempt=2',
    'terraform plan -var-file=prod.tfvars -target=module.edge_cache',
    'kubectl get pods -A -o wide | grep -E "CrashLoopBackOff|Error"',
    'const token = process.env.AWS_SESSION_TOKEN ?? "ephemeral";',
  ]
  const frameInterval = 1000 / 120
  const typingCharsPerSecond = 420
  const maxDpr = 2
  const xPad = 0
  const yPad = 0

  let width = 0
  let height = 0
  let fontSize = 9
  let charWidth = 6
  let lineHeight = 12
  let columns = 0
  let rows = 0
  let lines = []
  let energies = []
  let rowSources = []
  let cursor = null
  let charsPerMs = typingCharsPerSecond / 1000
  let charAccumulator = 0
  let startupPhaseActive = true
  let startupBackspaceBurstsLeft = 4
  let startupBackspaceCooldownMs = 0
  let pendingBackspaces = 0
  let rafId = 0
  let lastFrameTime = 0

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
  const pickSnippet = () => snippets[(Math.random() * snippets.length) | 0]
  const rowLimit = () => Math.max(1, columns - 1)
  const startupBoostDepth = 0.75
<<<<<<< ours
  const fastStartRowTarget = 8
  const postStartupMultiplier = 3.4
=======
  const postStartupMultiplier = 1.95
>>>>>>> theirs

  const buildCodeLine = () => {
    const targetLength = Math.max(56, columns + 28)
    let line = pickSnippet()
    while (line.length < targetLength + 24) {
      line += `  ${pickSnippet()}`
    }
    return line
  }

  const createCursor = () => ({
    row: 0,
    col: 0,
    mode: 'typing',
  })

  const primeStaticFrame = () => {
    const limit = rowLimit()
    lines = Array.from({ length: rows }, () => buildCodeLine().slice(0, limit))
    energies = Array.from({ length: rows }, () => 0.5)
    rowSources = Array.from({ length: rows }, () => '')
    const lastRow = Math.max(0, rows - 1)
    cursor = {
      row: lastRow,
      col: lines[lastRow]?.length || 0,
      mode: 'done',
    }
    charAccumulator = 0
  }

  const resetStream = () => {
    lines = Array.from({ length: rows }, () => '')
    energies = Array.from({ length: rows }, () => 0)
    rowSources = Array.from({ length: rows }, () => buildCodeLine())
    cursor = createCursor()
    charsPerMs = typingCharsPerSecond / 1000
    charAccumulator = 0
    startupPhaseActive = true
    startupBackspaceBurstsLeft = 4
    startupBackspaceCooldownMs = 0
    pendingBackspaces = 0
  }

  const scrollUp = () => {
    if (rows <= 1) {
      lines[0] = ''
      energies[0] = 0
      rowSources[0] = buildCodeLine()
      cursor.row = 0
      cursor.col = 0
      return
    }

    for (let row = 0; row < rows - 1; row += 1) {
      lines[row] = lines[row + 1]
      energies[row] = Math.max(0.08, energies[row + 1] * 0.985)
    }

    const lastRow = rows - 1
    lines[lastRow] = ''
    energies[lastRow] = 0
    rowSources[lastRow] = buildCodeLine()
    cursor.row = lastRow
    cursor.col = 0
  }

  const advanceRow = () => {
    cursor.row += 1
    cursor.col = 0

    if (cursor.row >= rows) {
      scrollUp()
      return
    }

    lines[cursor.row] = ''
    energies[cursor.row] = Math.max(energies[cursor.row], 0.12)
    rowSources[cursor.row] = buildCodeLine()
  }

  const startupDepthRows = () => {
    if (!cursor || rows === 0) return 0
    const limit = rowLimit()
    const currentRowFill = (lines[cursor.row]?.length || 0) / Math.max(1, limit)
    return cursor.row + currentRowFill
  }

  const fastStartRow = () => Math.min(fastStartRowTarget, Math.max(2, rows - 2))

  const startupProgress = () => {
    if (rows === 0) return 0
    const cursorDepth = startupDepthRows()
    const targetDepth = Math.max(1, rows * startupBoostDepth)
    return clamp(cursorDepth / targetDepth, 0, 1)
  }

  const speedMultiplier = (depthRows, fastRow) => {
    if (!startupPhaseActive) return postStartupMultiplier
<<<<<<< ours
<<<<<<< ours
    if (depthRows < fastRow) return 0.42
    return postStartupMultiplier
=======
    if (progress < 0.3) return 0.42
=======
    if (progress < 0.25) return 0.42
>>>>>>> theirs
    if (progress < 0.58) return 1.52
    return 0.78
>>>>>>> theirs
  }

  const queueBackspaceBurst = (progress, depthRows, fastRow) => {
    if (!startupPhaseActive || pendingBackspaces > 0 || startupBackspaceBurstsLeft <= 0) return
<<<<<<< ours
    if (depthRows >= fastRow) return
=======
>>>>>>> theirs
    if (startupBackspaceCooldownMs > 0) return
    if (progress < 0.12 || progress > 0.9) return

    const activeLine = lines[cursor.row] || ''
    if (activeLine.length < 8 || cursor.col < 2) return

    const chance = progress < 0.55 ? 0.18 : 0.11
    if (Math.random() > chance) return

    pendingBackspaces = 1 + ((Math.random() * 3) | 0)
    startupBackspaceBurstsLeft -= 1
    startupBackspaceCooldownMs = 130 + Math.random() * 170
  }

  const update = (deltaMs) => {
    if (!cursor || rows === 0) return

    for (let index = 0; index < energies.length; index += 1) {
      energies[index] *= 0.989
    }

    startupBackspaceCooldownMs = Math.max(0, startupBackspaceCooldownMs - deltaMs)
    const progress = startupProgress()
<<<<<<< ours
    const depthRows = startupDepthRows()
    const fastRow = fastStartRow()
    const multiplier = speedMultiplier(depthRows, fastRow)
=======
    const multiplier = speedMultiplier(progress)
>>>>>>> theirs
    charAccumulator += deltaMs * charsPerMs * multiplier
    let steps = Math.min(2600, Math.floor(charAccumulator))
    if (steps < 1) return
    charAccumulator -= steps

    if (startupPhaseActive && progress >= 1) {
      startupPhaseActive = false
      pendingBackspaces = 0
      startupBackspaceBurstsLeft = 0
    }

<<<<<<< ours
    if (depthRows >= fastRow) {
      pendingBackspaces = 0
      startupBackspaceBurstsLeft = 0
    }

    queueBackspaceBurst(progress, depthRows, fastRow)
=======
    queueBackspaceBurst(progress)
>>>>>>> theirs

    const limit = rowLimit()

    while (steps > 0) {
      if (cursor.row < 0 || cursor.row >= rows) {
        scrollUp()
        steps -= 1
        continue
      }

      if (lines[cursor.row].length >= limit) {
        advanceRow()
        steps -= 1
        continue
      }

      if (pendingBackspaces > 0) {
        const activeLine = lines[cursor.row] || ''
        if (activeLine.length > 0 && cursor.col > 0) {
          lines[cursor.row] = activeLine.slice(0, -1)
          cursor.col -= 1
          energies[cursor.row] = 0.95
          pendingBackspaces -= 1
          steps -= 1
          continue
        }
        pendingBackspaces = 0
      }

      let source = rowSources[cursor.row]
      if (!source || cursor.col >= source.length) {
        source = buildCodeLine()
        rowSources[cursor.row] = source
        cursor.col = 0
      }

      lines[cursor.row] += source[cursor.col]
      energies[cursor.row] = 1
      cursor.col += 1
      steps -= 1
    }
  }

  const paintFrame = (time, reset = false) => {
    if (!width || !height) return
    if (reset) context.clearRect(0, 0, width, height)

    context.fillStyle = 'rgba(5, 10, 16, 0.068)'
    context.fillRect(0, 0, width, height)
    context.font = `${fontSize}px "JetBrains Mono", monospace`
    context.textAlign = 'left'
    context.textBaseline = 'top'

    for (let row = 0; row < rows; row += 1) {
      if (!lines[row]) continue
      const alpha = 0.03 + energies[row] * 0.2
      context.fillStyle = `rgba(86, 218, 139, ${alpha})`
      context.fillText(lines[row].trimEnd(), xPad, yPad + row * lineHeight)
    }

    if (cursor && cursor.mode === 'typing' && Math.floor(time / 220) % 2 === 0) {
      context.fillStyle = 'rgba(188, 255, 211, 0.24)'
      const cursorX = xPad + (lines[cursor.row]?.length || 0) * charWidth
      const cursorY = yPad + cursor.row * lineHeight + fontSize * 0.84
      context.fillRect(cursorX, cursorY, Math.max(2, fontSize * 0.5), 1.35)
    }
  }

  const resize = () => {
    const rect = host.getBoundingClientRect()
    width = Math.max(1, Math.floor(rect.width))
    height = Math.max(1, Math.floor(rect.height))

    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    context.setTransform(dpr, 0, 0, dpr, 0, 0)

    fontSize = clamp(Math.round(width / 128), 8, 10)
    charWidth = fontSize * 0.62
    lineHeight = fontSize * 1.36
    columns = Math.max(28, Math.floor(width / charWidth))
    rows = Math.max(5, Math.floor(height / lineHeight))
    if (reducedMotionQuery.matches) {
      primeStaticFrame()
    } else {
      resetStream()
    }
    paintFrame(performance.now(), true)
  }

  const tick = (time) => {
    if (!lastFrameTime) lastFrameTime = time
    const elapsed = time - lastFrameTime
    if (elapsed >= frameInterval) {
      update(Math.min(elapsed, 90))
      paintFrame(time)
      lastFrameTime = time
    }
    rafId = window.requestAnimationFrame(tick)
  }

  const stop = () => {
    if (!rafId) return
    window.cancelAnimationFrame(rafId)
    rafId = 0
  }

  const start = () => {
    if (rafId || reducedMotionQuery.matches) return
    lastFrameTime = 0
    rafId = window.requestAnimationFrame(tick)
  }

  resize()
  start()

  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
  resizeObserver?.observe(host)
  window.addEventListener('resize', resize, { passive: true })

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop()
      return
    }
    start()
  })

  const handleMotionChange = () => {
    if (reducedMotionQuery.matches) {
      stop()
      primeStaticFrame()
      paintFrame(performance.now(), true)
      return
    }
    resetStream()
    paintFrame(performance.now(), true)
    start()
  }

  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', handleMotionChange)
  } else if (typeof reducedMotionQuery.addListener === 'function') {
    reducedMotionQuery.addListener(handleMotionChange)
  }
})()


const sideNavButtons = Array.from(document.querySelectorAll('#sideNav .side-link'))
if (sideNavButtons.length) {
  const activateSideNavButton = (activeButton) => {
    sideNavButtons.forEach((button) => {
      const isActive = button === activeButton
      button.classList.toggle('is-active', isActive)
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false')
    })
  }

  const initialSideNavButton = sideNavButtons.find((button) => button.classList.contains('is-active')) || sideNavButtons[0]
  activateSideNavButton(initialSideNavButton)
  sideNavButtons.forEach((button) => {
    button.addEventListener('click', () => activateSideNavButton(button))
  })
}

const filterButtons = Array.from(document.querySelectorAll('[data-filter]'))
const projectCards = Array.from(document.querySelectorAll('[data-project]'))

const applyFilter = (filter) => {
  projectCards.forEach((card) => {
    const categories = (card.dataset.category || '').split(/\s+/).filter(Boolean)
    const show = filter === 'all' || categories.includes(filter)
    card.classList.toggle('hidden', !show)
  })
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter || 'all'
    filterButtons.forEach((btn) => btn.classList.toggle('is-active', btn === button))
    applyFilter(filter)
  })
})

const copyEmailButton = document.getElementById('copyEmail')
if (copyEmailButton && navigator.clipboard) {
  copyEmailButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('levi@cloud.dev')
      copyEmailButton.setAttribute('aria-label', 'Email copied')
      window.setTimeout(() => copyEmailButton.setAttribute('aria-label', 'Copy email address'), 1200)
    } catch {
      // Intentionally silent: copy support depends on browser context.
    }
  })
}
