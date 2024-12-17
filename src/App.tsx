import { Route, Routes } from "react-router";
import CollaborativeTextEditor from "./CollaborativeTextEditor";
import Documents from "./Documents";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Documents />}
      />
      <Route
        path="document/:id"
        element={<CollaborativeTextEditor />}
      />
    </Routes>
  );
}

export default App;
