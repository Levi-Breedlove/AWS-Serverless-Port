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
  ]
  const frameInterval = 1000 / 120
  const targetLoadMs = 1700
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
  let cursor = null
  let isComplete = false
  let codeRows = []
  let totalChars = 0
  let totalTyped = 0
  let charsPerMs = 0
  let charAccumulator = 0
  let rafId = 0
  let lastFrameTime = 0

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
  const pickSnippet = () => snippets[(Math.random() * snippets.length) | 0]

  const buildCodeLine = () => {
    const targetLength = Math.max(56, columns + 16)
    let line = pickSnippet()
    while (line.length < targetLength + 10) {
      line += `  ${pickSnippet()}`
    }
    return line
  }

  const prepareRow = (row) => {
    lines[row] = ''
    energies[row] = 0
  }

  const createCursor = () => ({
    row: 0,
    col: 0,
    offset: 0,
    mode: 'typing',
  })

  const finishTyping = () => {
    isComplete = true
    cursor.mode = 'done'
    const lastRow = Math.max(0, rows - 1)
    cursor.row = lastRow
    cursor.col = codeRows[lastRow]?.length || 0
    for (let index = 0; index < energies.length; index += 1) {
      energies[index] = Math.max(energies[index], 0.58)
    }
  }

  const fillAll = () => {
    for (let row = 0; row < rows; row += 1) {
      lines[row] = codeRows[row] || ''
      energies[row] = 0.58
    }
    totalTyped = totalChars
    charAccumulator = 0
    finishTyping()
  }

  const rebuildTimeline = () => {
    codeRows = Array.from({ length: rows }, () => buildCodeLine().slice(0, Math.max(1, columns - 1)))
    totalChars = 0

    for (let row = 0; row < rows; row += 1) {
      totalChars += codeRows[row].length
      prepareRow(row)
    }

    totalTyped = 0
    charsPerMs = totalChars > 0 ? totalChars / targetLoadMs : 0
    charAccumulator = 0
    isComplete = totalChars === 0
    cursor = createCursor()
    if (isComplete) cursor.mode = 'done'
    cursor.row = 0
    cursor.col = 0
  }

  const update = (deltaMs) => {
    if (!cursor || isComplete) return

    for (let index = 0; index < energies.length; index += 1) {
      energies[index] *= 0.992
    }

    charAccumulator += deltaMs * charsPerMs
    let steps = Math.min(1800, Math.floor(charAccumulator))
    if (steps < 1) return
    charAccumulator -= steps

    while (steps > 0 && !isComplete) {
      if (cursor.row >= rows) {
        finishTyping()
        break
      }

      const source = codeRows[cursor.row] || ''
      if (cursor.col >= source.length) {
        cursor.row += 1
        cursor.col = 0
        continue
      }

      lines[cursor.row] += source[cursor.col]
      energies[cursor.row] = 1
      cursor.col += 1
      totalTyped += 1

      if (totalTyped >= totalChars) {
        finishTyping()
        break
      }

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

    if (cursor && cursor.mode === 'typing' && Math.floor(time / 380) % 2 === 0) {
      context.fillStyle = 'rgba(188, 255, 211, 0.24)'
      const cursorX = xPad + (cursor.offset + cursor.col) * charWidth
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
    lines = Array.from({ length: rows }, () => '')
    energies = Array.from({ length: rows }, () => 0)
    rebuildTimeline()
    if (reducedMotionQuery.matches) fillAll()
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
    if (isComplete) {
      rafId = 0
      return
    }
    rafId = window.requestAnimationFrame(tick)
  }

  const stop = () => {
    if (!rafId) return
    window.cancelAnimationFrame(rafId)
    rafId = 0
  }

  const start = () => {
    if (rafId || reducedMotionQuery.matches || isComplete) return
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
      paintFrame(performance.now(), true)
      return
    }
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
