"use client";

import { useEffect, useRef, useState } from "react";

// Push-to-talk speech input (ADR 0006). Web Speech `SpeechRecognition` — native, $0,
// no vendor. The recognized text is handed back to FILL the chat input; we NEVER
// auto-send (confirm-before-send is the repair UX that makes imperfect kid-STT usable).
//
// SpeechRecognition isn't in the standard TS DOM lib (vendor-prefixed), so we declare
// the minimal shape we use rather than reaching for `any`.

type AlternativeLike = { readonly transcript: string };
type ResultLike = {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: AlternativeLike;
};
type ResultListLike = { readonly length: number; readonly [index: number]: ResultLike };
type RecognitionEventLike = { readonly results: ResultListLike };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechInputSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function useSpeechInput(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  // Abort any in-flight recognition if the component unmounts.
  useEffect(() => () => recRef.current?.abort(), []);

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor || recRef.current) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true; // show words as the kid talks
    rec.continuous = true; // keep listening through pauses until the kid taps "Send it!"
    rec.onresult = (e) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) finalText += t;
        else interim += t;
      }
      onTextRef.current((finalText + interim).trim());
    };
    const cleanup = () => {
      recRef.current = null;
      setListening(false);
    };
    rec.onend = cleanup;
    rec.onerror = cleanup;
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  function stop() {
    recRef.current?.stop();
  }

  return { listening, start, stop, supported: speechInputSupported() };
}
