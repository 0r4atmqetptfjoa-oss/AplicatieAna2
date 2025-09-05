import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export function Learning() {
  const nav = useNavigate();
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Mod învățare</h1>
      <p className="text-sm text-muted-foreground">
        Alege una dintre opțiuni: <strong>Rezumate mari</strong> din tematica ofițeri sau{" "}
        <strong>Tematica completă</strong> pentru citit (PDF/Doc).
      </p>

      <div className="grid grid-cols-1 gap-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 px-5 rounded-2xl bg-primary text-primary-foreground shadow-md"
          onClick={() => nav("/summaries")}
        >
          Rezumate mari (tematica ofițeri)
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 px-5 rounded-2xl bg-secondary text-secondary-foreground shadow-md"
          onClick={() => nav("/docs")}
        >
          Tematica completă (documente)
        </motion.button>
      </div>
    </div>
  );
}

// ✅ Fix: export default pentru a fi compatibil cu importul din App.tsx
export default Learning;
