export function parseToml(text: string): Record<string, unknown> {
  const lines = text.split(/\r?\n/)
  const cfg: Record<string, unknown> = {}

  for (const line of lines) {
    if (!line?.trim() || line.trim().startsWith("#")) continue

    const lineContent = clearLine(line)
    const match = lineContent.match(/^([^=]+)=(.*)$/)
    if (!match) continue

    const key = match[1].trim()
    const value = match[2].trim()

    let convertedValue: string | number | boolean = value
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      convertedValue = value.slice(1, -1)
    } else if (value === "true") {
      convertedValue = true
    } else if (value === "false") {
      convertedValue = false
    } else {
      const num = Number(value)
      if (value !== "" && !isNaN(num)) convertedValue = num
    }

    cfg[key] = convertedValue
  }

  return cfg
}

function clearLine(line: string): string {
  const regex = /^((?:[^"'#]|"[^"]*"|'[^']*')*)(#.*)?$/
  const match = line.match(regex)
  return match ? match[1].trim() : line.trim()
}
