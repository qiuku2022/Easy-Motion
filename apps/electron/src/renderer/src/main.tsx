import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

createRoot(root).render(
  <StrictMode>
    <TooltipProvider delayDuration={300}>
      <App />
      <Toaster theme="dark" position="bottom-right" closeButton />
    </TooltipProvider>
  </StrictMode>
);
