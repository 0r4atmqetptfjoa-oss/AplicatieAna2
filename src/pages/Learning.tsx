import { useEffect, useMemo, useState } from "react";
import { fetchLearningIndex, fetchSummary, type LearningUnit } from "@/lib/publicData";
import LessonCard from "@/components/LessonCard";
import { getStats } from "@/lib/learningProgress";
import AiActions from "@/components/AiActions";

type Tab = "rezumate" | "tematica";

export default function Learning() {
  const [tab, setTab] = useState<Tab>("rezumate");
  const [q, setQ] = useState("");
  const [units, setUnits] = useState<LearningUnit[]>([]);
  const [leg, setLeg] = useState<string>("");
  const [log, setLog] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [topicFilter, setTopicFilter] = useState<"all"|"leg"|"log">("all");
  const [sortBy, setSortBy] = useState<"title"|"reading">("title");
  const [stats, setStats] = useState({ read:0, bookmarked:0 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const index = await fetchLearningIndex();
        const [legMd, logMd] = await Promise.all([
          fetchSummary("legislation").catch(()=>"# Rezumat legislație nu a putut fi încărcat."),
          fetchSummary("logistics").catch(()=>"# Rezumat logistică nu a putut fi încărcat."),
        ]);
        if (!mounted) return;
        setUnits(index.units || []);
        setLeg(legMd);
        setLog(logMd);
        setError("");
      } catch (e:any) {
        setError(e?.message || "Eroare la încărcarea datelor.");
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(()=>{
    const ids = filtered.map(u=>u.id);
    setStats(getStats(ids));
  }, [units, q, topicFilter, sortBy]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let arr = units.slice();
    if (topicFilter==="leg") arr = arr.filter(u=>u.topic.includes("Legisla"));
    if (topicFilter==="log") arr = arr.filter(u=>u.topic.includes("Sprijin"));
    if (query) {
      arr = arr.filter(u =>
        u.title.toLowerCase().includes(query) ||
        u.topic.toLowerCase().includes(query) ||
        (u.body_html && u.body_html.toLowerCase().includes(query))
      );
    }
    if (sortBy==="title") arr.sort((a,b)=>a.title.localeCompare(b.title, 'ro'));
    if (sortBy==="reading") arr.sort((a,b)=>(a.reading_min||0)-(b.reading_min||0));
    return arr;
  }, [q, units, topicFilter, sortBy]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">Mod învățare</h1>
        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-2 rounded-lg border text-sm ${tab==="rezumate" ? "bg-primary text-white" : ""}`}
            onClick={() => setTab("rezumate")}
          >Rezumate</button>
          <button
            className={`px-3 py-2 rounded-lg border text-sm ${tab==="tematica" ? "bg-primary text-white" : ""}`}
            onClick={() => setTab("tematica")}
          >Tematica</button>
        </div>
      </div>

      {loading && <div className="opacity-70">Se încarcă…</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && tab === "rezumate" && (
        <section className="space-y-6">
          <article className="prose max-w-none">
            <h2>Legislație</h2>
            <Markdown text={leg} />
            <AiActions text={leg} />
          </article>
          <article className="prose max-w-none">
            <h2>Logistică</h2>
            <Markdown text={log} />
            <AiActions text={log} />
          </article>
        </section>
      )}

      {!loading && !error && tab === "tematica" && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Caută în tematică…"
              className="w-full rounded-xl border px-3 py-2 md:col-span-2"
            />
            <select value={topicFilter} onChange={e=>setTopicFilter(e.target.value as any)} className="rounded-xl border px-3 py-2">
              <option value="all">Toate temele</option>
              <option value="leg">Doar Legislație</option>
              <option value="log">Doar Logistică</option>
            </select>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} className="rounded-xl border px-3 py-2">
              <option value="title">Sortează: Titlu</option>
              <option value="reading">Sortează: Timp citire</option>
            </select>
          </div>

          <div className="text-xs opacity-70">Afișezi {filtered.length} unități • Citite: {stats.read} • Salvate: {stats.bookmarked}</div>

          <div className="space-y-3">
            {filtered.map(u => (
              <LessonCard key={u.id} id={u.id} topic={u.topic} title={`${u.title} • ~${u.reading_min||1} min`} body_html={u.body_html} />
            ))}
            {filtered.length === 0 && (
              <div className="opacity-70 text-sm">Nimic găsit pentru „{q}”.</div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// simple markdown renderer
function Markdown({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  type Block = { t: "h2" | "li" | "p"; s: string };
  const blocks: Block[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("# ")) blocks.push({ t: "h2", s: trimmed.replace(/^#\s*/, "") });
    else if (trimmed.startsWith("- ")) blocks.push({ t: "li", s: trimmed.replace(/^- /, "") });
    else blocks.push({ t: "p", s: trimmed });
  }

  const rendered: JSX.Element[] = [];
  let liGroup: string[] = [];
  const flush = () => {
    if (!liGroup.length) return;
    rendered.push(<ul key={`ul-${rendered.length}`} className="list-disc pl-6 my-2">
      {liGroup.map((s, i) => <li key={i} dangerouslySetInnerHTML={{ __html: s }} />)}
    </ul>);
    liGroup = [];
  };

  blocks.forEach((b, i) => {
    if (b.t === "h2") { flush(); rendered.push(<h2 key={`h2-${i}`} className="text-lg font-semibold">{b.s}</h2>); }
    else if (b.t === "li") { liGroup.push(b.s); }
    else { flush(); rendered.push(<p key={`p-${i}`} dangerouslySetInnerHTML={{ __html: b.s }} />); }
  });
  flush();

  return <div>{rendered}</div>;
}
