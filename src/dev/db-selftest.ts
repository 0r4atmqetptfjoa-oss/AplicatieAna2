// Rulează acest fișier în dev (se importă în App la nevoie) ca să verifici bazele de date fără a afecta UI-ul.
(async function dbSelfTest(){
  try{
    const [leg, spec, psy, eng] = await Promise.all([
      fetch("/data/v12/legislation.json").then(r=>r.json()),
      fetch("/data/v12/logistics.json").then(r=>r.json()),
      fetch("/data/v12/psychology.json").then(r=>r.json()),
      fetch("/data/v12/english.json").then(r=>r.json())
    ])
    const cLeg = leg?.meta?.count ?? leg?.questions?.length ?? 0
    const cSpec = spec?.meta?.count ?? spec?.questions?.length ?? 0
    const cPsy = psy?.meta?.count ?? psy?.questions?.length ?? 0
    const cEngTests = eng?.meta?.testsCount ?? (eng?.tests?.length ?? 0)
    console.log("[DB SELFTEST] OK → Leg:", cLeg, "| Spec:", cSpec, "| Psy:", cPsy, "| EngTests:", cEngTests)
  }catch(e){
    console.warn("[DB SELFTEST] Eroare la încărcarea bazelor:", e)
  }
})();