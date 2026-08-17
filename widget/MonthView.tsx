import { Gtk } from "ags/gtk4"
import { createState, createComputed, createEffect, type Accessor } from "ags"
import type { Config } from "../lib/config"
import { monthMatrix, weekdayLabels, monthLabel, isSameDay } from "../lib/date"

/**
 * Conteúdo do popup: cabeçalho com navegação + grade do mês.
 *
 * As 42 células são criadas uma única vez e só têm suas propriedades
 * atualizadas quando o mês muda. Widgets GTK são objetos caros e persistentes —
 * ao contrário do React, aqui não existe reconciliação, então recriar a grade a
 * cada navegação seria desperdício.
 */
export default function MonthView({
  config,
  opened,
}: {
  config: Config
  opened: Accessor<number>
}) {
  const now = new Date()

  const [cursor, setCursor] = createState({
    year: now.getFullYear(),
    month: now.getMonth(),
  })
  const [selected, setSelected] = createState<Date | null>(null)

  const [today, setToday] = createState(now)

  const cells = createComputed(() => {
    const { year, month } = cursor()
    return monthMatrix(year, month, config.firstDayOfWeek, today()).flat()
  })

  const title = createComputed(() => {
    const { year, month } = cursor()
    return monthLabel(year, month, config.locale)
  })

  function shift(months: number) {
    const { year, month } = cursor.get()
    const target = new Date(year, month + months, 1)
    setCursor({ year: target.getFullYear(), month: target.getMonth() })
  }

  function goToToday() {
    const agora = new Date()
    setToday(agora)
    setCursor({ year: agora.getFullYear(), month: agora.getMonth() })
    setSelected(agora)
  }

  createEffect(() => {
    opened()

    const agora = new Date()
    setToday(agora)
    setCursor({ year: agora.getFullYear(), month: agora.getMonth() })
    setSelected(null)
  })

  function navButton(label: string, tooltip: string, months: number) {
    return (
      <button class="nav" tooltipText={tooltip} onClicked={() => shift(months)}>
        <label label={label} />
      </button>
    )
  }

  function dayButton(index: number) {
    const cell = cells.as((all) => all[index])

    return (
      <button
        class={createComputed(() => {
          const { inMonth, isToday, date } = cells()[index]
          const active = selected()

          const classes = ["day"]
          if (!inMonth) classes.push("outside")
          if (isToday) classes.push("today")
          if (active && isSameDay(active, date)) classes.push("selected")
          return classes.join(" ")
        })}
        onClicked={() => setSelected(cells.get()[index].date)}
      >
        <label label={cell.as((c) => String(c.label))} />
      </button>
    )
  }

  return (
    <box orientation={Gtk.Orientation.VERTICAL} class="month">
      <box class="header">
        {navButton("«", "Ano anterior", -12)}
        {navButton("‹", "Mês anterior", -1)}
        <button
          class="title"
          hexpand
          tooltipText="Ir para hoje"
          onClicked={goToToday}
        >
          <label label={title} />
        </button>
        {navButton("›", "Próximo mês", 1)}
        {navButton("»", "Próximo ano", 12)}
      </box>

      <box class="weekdays" homogeneous>
        {weekdayLabels(config.locale, config.firstDayOfWeek).map((name) => (
          <label class="weekday" label={name} />
        ))}
      </box>

      <box orientation={Gtk.Orientation.VERTICAL} class="grid">
        {Array.from({ length: 6 }, (_, week) => (
          <box homogeneous>
            {Array.from({ length: 7 }, (_, day) => dayButton(week * 7 + day))}
          </box>
        ))}
      </box>
    </box>
  )
}
