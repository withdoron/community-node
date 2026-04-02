import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

const STOP_VOICE_EVENT = 'fs-stop-voice';

export default function VoiceInput({ onTranscript, mode = 'single', className = '' }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const stop = () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setListening(false);
    };
    window.addEventListener(STOP_VOICE_EVENT, stop);
    return () => window.removeEventListener(STOP_VOICE_EVENT, stop);
  }, []);

  const isSupported =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const startListening = () => {
    if (!isSupported) return;

    // Stop any other active voice inputs
    window.dispatchEvent(new Event(STOP_VOICE_EVENT));

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = mode === 'continuous';
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (event.results[event.results.length - 1].isFinal) {
        onTranscript(transcript.trim());
      }
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={listening ? stopListening : startListening}
      className={`p-2 rounded-lg transition-all ${
        listening
          ? 'bg-red-500/20 text-red-400 animate-pulse'
          : 'bg-surface hover:bg-surface text-muted-foreground hover:text-primary'
      } ${className}`}
      title={listening ? 'Stop listening' : 'Speak'}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
