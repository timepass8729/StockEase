
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import "./styles/darkMode.css";
// Import jspdf and jspdf-autotable globally
import jsPDF from "jspdf";
import "jspdf-autotable";

// The type declaration is now handled in invoiceService.ts

createRoot(document.getElementById("root")!).render(<App />);
