import { registerRootComponent } from "expo";

// Must be imported at the top level so the background task is defined before the app starts
import "./src/services/tracking";
import App from "./App";

registerRootComponent(App);