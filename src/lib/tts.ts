// src/lib/tts.ts
export let ttsEnabled = true;
export function setTtsEnabled(v: boolean){ ttsEnabled = v; }
export function speak(text: string){
  try{
    if(!ttsEnabled) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ro-RO";
    u.rate = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch{}
}
