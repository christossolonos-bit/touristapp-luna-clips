import { useCallback, useEffect, useState } from "react";

/** Text-to-speech via speechSynthesis. */
export function useSpeech() {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  const supported = Boolean(synth);
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback(
    (text, lang = "en-US") => {
      if (!supported || !text) return;
      synth.cancel(); // stop anything already speaking
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      setSpeaking(true);
      synth.speak(u);
    },
    [supported, synth]
  );

  const cancel = useCallback(() => {
    synth?.cancel();
    setSpeaking(false);
  }, [synth]);

  // Stop speech if the component using it unmounts.
  useEffect(() => () => synth?.cancel(), [synth]);

  return { supported, speaking, speak, cancel };
}
