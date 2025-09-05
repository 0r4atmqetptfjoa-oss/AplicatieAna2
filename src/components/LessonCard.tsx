import { markRead, toggleBookmark, loadProgress } from "@/lib/learningProgress";
import { useEffect, useState } from "react";
import AiActions from "@/components/AiActions";

export default function LessonCard({ id, topic, title, body_html }: { id:string; topic:string; title:string; body_html:string; }) {
  const [state, setState] = useState({ read:false, bookmarked:false });

  useEffect(()=>{
    const p = loadProgress();
    if (p[id]) setState({ read: !!p[id].read, bookmarked: !!p[id].bookmarked });
  }, [id]);

  const onOpen = ()=>{
    markRead(id);
    setState(s => ({...s, read:true}));
  };
  const onBookmark = (e:any)=>{
    e.stopPropagation();
    toggleBookmark(id);
    setState(s => ({...s, bookmarked: !s.bookmarked}));
  };

  const plainText = (()=> {
    const tmp = document.createElement("div");
    tmp.innerHTML = body_html;
    return (tmp.textContent || tmp.innerText || "").trim().slice(0, 4000);
  })();

  return (
    <details className="rounded-2xl border bg-bg/50 overflow-hidden group">
      <summary onClick={onOpen} className="cursor-pointer select-none px-4 py-3 font-medium flex items-center gap-3">
        <span className="text-xl">{topic.includes("Legis") ? "📘" : "🛠️"}</span>
        <span className="flex-1">{title}</span>
        <button onClick={onBookmark} className="text-sm rounded-lg px-2 py-1 border hover:bg-accent/20">
          {state.bookmarked ? "★ Saved" : "☆ Save"}
        </button>
        <span className={`text-xs rounded px-2 py-0.5 ${state.read ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
          {state.read ? "Read" : "New"}
        </span>
      </summary>
      <div className="p-4 text-sm leading-relaxed">
        <div dangerouslySetInnerHTML={{ __html: body_html }} />
        <AiActions text={plainText} compact />
      </div>
    </details>
  );
}
