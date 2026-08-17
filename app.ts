import app from "ags/gtk4/app"
import style from "./style.scss"
import Calendar from "./widget/Calendar"
import { loadConfig, CONFIG_PATH } from "./io/config"

app.start({
  instanceName: "hyprcal",
  css: style,
  main() {
    const { config, errors } = loadConfig()

    for (const { field, value, expected } of errors) {
      console.warn(
        `${CONFIG_PATH}: ignorando ${field} = ${JSON.stringify(value)} — esperado ${expected}`,
      )
    }

    Calendar(config)
  },
})
