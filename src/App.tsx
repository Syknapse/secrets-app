import { CreateSecret } from "./components/CreateSecret";
import { ViewSecret } from "./components/ViewSecret";
import "./App.css";

function App() {
  return location.hash ? <ViewSecret /> : <CreateSecret />;
}

export default App;
