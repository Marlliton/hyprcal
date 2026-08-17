import type { FirstDayOfWeek } from "./config"

/**
 * Lógica de calendário, sem nenhuma dependência de GTK.
 *
 * Tudo aqui é função pura: recebe ano/mês, devolve dados. É onde moram os
 * casos chatos (semana começando na segunda, fevereiro bissexto, meses que
 * atravessam 6 semanas), então vale poder exercitar sem abrir janela.
 */

export interface DayCell {
  date: Date
  /** Número do dia, 1–31. */
  label: number
  /** Falso para os dias vazados do mês anterior/seguinte. */
  inMonth: boolean
  isToday: boolean
}

/** Domingo é 0 no `Date.getDay()`. */
function weekdayOffset(date: Date, firstDay: FirstDayOfWeek): number {
  return firstDay === "monday" ? (date.getDay() + 6) % 7 : date.getDay()
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Grade do mês, sempre 6×7.
 *
 * O tamanho fixo é deliberado: alguns meses cabem em 5 semanas e outros
 * precisam de 6, e se a grade encolhesse o popup mudaria de altura ao navegar
 * entre meses. 42 células sempre — sobra ou falta vira dia vazado.
 *
 * @param month Base zero, como no `Date` — 0 é janeiro.
 */
export function monthMatrix(
  year: number,
  month: number,
  firstDay: FirstDayOfWeek,
  today: Date = new Date(),
): DayCell[][] {
  const first = new Date(year, month, 1)
  const offset = weekdayOffset(first, firstDay)

  const weeks: DayCell[][] = []

  for (let week = 0; week < 6; week++) {
    const days: DayCell[] = []

    for (let day = 0; day < 7; day++) {
      // O construtor normaliza overflow (dia 0 vira o último do mês anterior,
      // dia 32 vira o 1º do seguinte), então isso atravessa as bordas de mês e
      // ano sozinho — e sem aritmética de milissegundos, que quebraria no DST.
      const date = new Date(year, month, 1 - offset + week * 7 + day)

      days.push({
        date,
        label: date.getDate(),
        inMonth: date.getMonth() === month && date.getFullYear() === year,
        isToday: isSameDay(date, today),
      })
    }

    weeks.push(days)
  }

  return weeks
}

/** Cabeçalho da grade: ["seg", "ter", ...] no locale pedido. */
export function weekdayLabels(locale: string, firstDay: FirstDayOfWeek): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: "short" })

  // 2024-01-07 foi um domingo — âncora arbitrária só para gerar uma semana.
  const start = firstDay === "monday" ? 8 : 7

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2024, 0, start + i)
    // pt-BR devolve "dom." — o ponto só polui numa grade estreita.
    return format.format(date).replace(".", "")
  })
}

/** Título do popup: "Agosto de 2026". */
export function monthLabel(year: number, month: number, locale: string): string {
  const label = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1))

  return label.charAt(0).toUpperCase() + label.slice(1)
}
