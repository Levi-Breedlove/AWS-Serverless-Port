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
  const steadyCharsPerSecond = 340
  const singleCharCharsPerSecond = 42
  const streamCharsPerSecond = 3600
  const humanBurstMinChars = 5
  const humanBurstMaxChars = 15
  const humanBurstPauseMinMs = 70
  const humanBurstPauseMaxMs = 180
  const steadyPhaseMinMs = 520
  const pauseBeforeSingleMs = 900
  const singlePhaseMinMs = 600
  const singlePhaseMaxMs = 2600
  const PHASE_HUMAN = 'human-burst'
  const PHASE_STEADY = 'steady'
  const PHASE_PAUSE = 'pause'
  const PHASE_SINGLE = 'single-char'
  const PHASE_STREAM = 'stream'
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
  let charAccumulator = 0
  let phase = PHASE_HUMAN
  let phaseElapsedMs = 0
  let humanBurstCooldownMs = 0
  let humanPhaseDepthTarget = 5
  let steadyPhaseDepthTarget = 7
  let singlePhaseDepthTarget = 8
  let pendingBackspaces = 0
  let rafId = 0
  let lastFrameTime = 0

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
  const pickSnippet = () => snippets[(Math.random() * snippets.length) | 0]
  const rowLimit = () => Math.max(1, columns - 1)

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
    charAccumulator = 0
    phase = PHASE_HUMAN
    phaseElapsedMs = 0
    humanBurstCooldownMs = 0
    const maxDepth = Math.max(2, rows - 1)
    humanPhaseDepthTarget = Math.min(5, Math.max(4, maxDepth - 2))
    steadyPhaseDepthTarget = Math.min(maxDepth, humanPhaseDepthTarget + 2)
    singlePhaseDepthTarget = Math.min(maxDepth, steadyPhaseDepthTarget + 1)
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

  const streamDepthRows = () => {
    if (!cursor || rows === 0) return 0
    const limit = rowLimit()
    const currentRowFill = (lines[cursor.row]?.length || 0) / Math.max(1, limit)
    return cursor.row + currentRowFill
  }

  const setPhase = (nextPhase) => {
    if (phase === nextPhase) return
    phase = nextPhase
    phaseElapsedMs = 0
    charAccumulator = 0
    if (phase === PHASE_HUMAN) {
      humanBurstCooldownMs = 0
    }
  }

  const progressPhase = (depthRows, deltaMs) => {
    phaseElapsedMs += deltaMs

    if (phase === PHASE_HUMAN && (depthRows >= humanPhaseDepthTarget || phaseElapsedMs >= 3200)) {
      setPhase(PHASE_STEADY)
      return
    }

    if (
      phase === PHASE_STEADY &&
      ((depthRows >= steadyPhaseDepthTarget && phaseElapsedMs >= steadyPhaseMinMs) || phaseElapsedMs >= 1800)
    ) {
      setPhase(PHASE_PAUSE)
      return
    }

    if (phase === PHASE_PAUSE && phaseElapsedMs >= pauseBeforeSingleMs) {
      setPhase(PHASE_SINGLE)
      return
    }

    if (
      phase === PHASE_SINGLE &&
      ((depthRows >= singlePhaseDepthTarget && phaseElapsedMs >= singlePhaseMinMs) || phaseElapsedMs >= singlePhaseMaxMs)
    ) {
      setPhase(PHASE_STREAM)
    }
  }

  const stepBudgetForPhase = (deltaMs) => {
    if (!cursor) return 0

    if (phase === PHASE_PAUSE) return 0

    if (phase === PHASE_HUMAN) {
      humanBurstCooldownMs = Math.max(0, humanBurstCooldownMs - deltaMs)
      if (humanBurstCooldownMs > 0) return 0

      const activeLine = lines[cursor.row] || ''
      if (pendingBackspaces === 0 && activeLine.length > 7 && Math.random() < 0.19) {
        pendingBackspaces = 1 + ((Math.random() * 2) | 0)
      }

      humanBurstCooldownMs = humanBurstPauseMinMs + Math.random() * (humanBurstPauseMaxMs - humanBurstPauseMinMs)
      return humanBurstMinChars + ((Math.random() * (humanBurstMaxChars - humanBurstMinChars + 1)) | 0)
    }

    const charsPerMs =
      phase === PHASE_STEADY
        ? steadyCharsPerSecond / 1000
        : phase === PHASE_SINGLE
          ? singleCharCharsPerSecond / 1000
          : streamCharsPerSecond / 1000

    charAccumulator += deltaMs * charsPerMs

    if (phase === PHASE_SINGLE) {
      if (charAccumulator < 1) return 0
      charAccumulator -= 1
      return 1
    }

    const steps = Math.floor(charAccumulator)
    if (steps < 1) return 0
    charAccumulator -= steps
    return steps
  }

  const update = (deltaMs) => {
    if (!cursor || rows === 0) return

    for (let index = 0; index < energies.length; index += 1) {
      energies[index] *= 0.989
    }

    const depthRows = streamDepthRows()
    progressPhase(depthRows, deltaMs)

    let steps = Math.min(3200, stepBudgetForPhase(deltaMs))
    if (steps < 1) return

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
