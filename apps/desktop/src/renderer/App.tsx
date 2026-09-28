import { AppRouter } from "./app/router";
import { ToastHost } from "./components/ToastHost";

export default function App() {
  return (
    <>
      <AppRouter />
      <ToastHost />
    </>
  );
}