import app from "ags/gtk4/app"
import style from "./style.scss"
import Calendar from "./widget/Calendar"

app.start({
  instanceName: "hyprcal",
  css: style,
  main() {
    Calendar()
  },
})
