import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { preloadStartupHeroes } from "./lib/pageHeroCache";
import App from "./App.tsx";

preloadStartupHeroes();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
