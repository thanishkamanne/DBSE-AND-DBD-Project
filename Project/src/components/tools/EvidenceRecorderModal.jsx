import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Trash2,
  AlertCircle,
  Clock,
  Shield,
  CheckCircle2,
  FileAudio,
  Download
} from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { useSafety } from '../../context/SafetyContext.jsx';

export function EvidenceRecorderModal({ isOpen, onClose }) {
  const { recordings, addRecording, deleteRecording } = useSafety();

  const [micState, setMicState] = useState('idle'); // 'idle' | 'granted' | 'denied' | 'unsupported'
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const objectUrlsRef = useRef(new Map());

  // Check initial browser capability
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setMicState('unsupported');
    }
  }, []);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      // Revoke any created object URLs to prevent memory leaks
      objectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
      });
      objectUrlsRef.current.clear();
    };
  }, []);

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const requestMicrophone = async () => {
    setErrorMessage('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicState('unsupported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicState('granted');
      return stream;
    } catch (err) {
      console.warn('Microphone access denied:', err);
      setMicState('denied');
      setErrorMessage('Microphone access was denied. Recording could not start.');
      return null;
    }
  };

  const startRecording = async () => {
    setErrorMessage('');
    let stream = streamRef.current;
    if (!stream || !stream.active) {
      stream = await requestMicrophone();
      if (!stream) return;
    }

    try {
      audioChunksRef.current = [];
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      const startTimestamp = Date.now();
      startTimeRef.current = startTimestamp;

      recorder.onstop = () => {
        const actualElapsedSec = Math.max(
          1,
          Math.round((Date.now() - (startTimeRef.current || startTimestamp)) / 1000)
        );
        const resolvedType = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: resolvedType });
        if (audioBlob.size === 0) {
          setErrorMessage('Recording could not be saved: No audio data was captured.');
          setRecordSeconds(0);
          return;
        }

        const sizeKb = (audioBlob.size / 1024).toFixed(1);
        const recordingId = 'rec_' + Date.now();
        const objectUrl = URL.createObjectURL(audioBlob);
        objectUrlsRef.current.set(recordingId, objectUrl);

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result;
          const nextIndex = recordings.length + 1;
          const newRecording = {
            id: recordingId,
            name: `Evidence Log #${String(nextIndex).padStart(2, '0')}`,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: formatDuration(actualElapsedSec),
            durationSeconds: actualElapsedSec,
            size: `${sizeKb} KB`,
            mimeType: resolvedType,
            status: 'Stored locally on this device',
            audioData: base64Audio,
          };
          addRecording(newRecording);
          setRecordSeconds(0);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      setErrorMessage('Could not initialize audio recording: ' + (err.message || 'Unknown error'));
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  const handleTogglePlay = (rec) => {
    if (currentlyPlayingId === rec.id && isPlaying) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    // Resolve playback audio source
    let playUrl = objectUrlsRef.current.get(rec.id);
    if (!playUrl && rec.audioData) {
      if (rec.audioData.startsWith('data:')) {
        try {
          const parts = rec.audioData.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mime = (mimeMatch && mimeMatch[1]) || rec.mimeType || 'audio/webm';
          const binary = atob(parts[1]);
          const array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([array], { type: mime });
          playUrl = URL.createObjectURL(blob);
          objectUrlsRef.current.set(rec.id, playUrl);
        } catch (e) {
          playUrl = rec.audioData;
        }
      } else {
        playUrl = rec.audioData;
      }
    }

    if (!playUrl) {
      setErrorMessage('Audio data unavailable for playback.');
      return;
    }

    const audio = new Audio(playUrl);
    audioPlayerRef.current = audio;
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentlyPlayingId(null);
    };
    audio.onerror = (e) => {
      console.warn('Audio playback error:', e);
      setIsPlaying(false);
      setCurrentlyPlayingId(null);
      setErrorMessage('Failed to play audio recording.');
    };

    audio.play().then(() => {
      setCurrentlyPlayingId(rec.id);
      setIsPlaying(true);
    }).catch((e) => {
      console.warn('Playback failed:', e);
      setIsPlaying(false);
      setCurrentlyPlayingId(null);
    });
  };

  const handleDelete = (id) => {
    if (currentlyPlayingId === id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentlyPlayingId(null);
    }
    const cachedUrl = objectUrlsRef.current.get(id);
    if (cachedUrl) {
      try {
        URL.revokeObjectURL(cachedUrl);
      } catch (e) {}
      objectUrlsRef.current.delete(id);
    }
    deleteRecording(id);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (isRecording) stopRecording();
        if (audioPlayerRef.current) audioPlayerRef.current.pause();
        onClose();
      }}
      title="Evidence Recorder"
      description="Record and securely store ambient audio evidence locally in your browser."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* --- 1. RECORDING ACTION CARD --- */}
        <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xs">
          {micState === 'unsupported' ? (
            <div className="text-center py-4 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <h4 className="text-sm font-bold">Browser Audio Recording Unavailable</h4>
              <p className="text-xs text-slate-400">
                MediaRecorder API is not supported in this browser environment.
              </p>
            </div>
          ) : micState === 'denied' ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <MicOff className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Microphone permission required</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Access to the microphone is required to record audio evidence.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={requestMicrophone}
                leftIcon={<Mic className="w-4 h-4" />}
              >
                Allow Microphone
              </Button>
            </div>
          ) : isRecording ? (
            <div className="text-center py-4 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Recording Active
              </div>

              <div className="text-5xl font-black font-mono tracking-tight text-white">
                {formatDuration(recordSeconds)}
              </div>

              <p className="text-xs text-slate-400">
                Capturing ambient sound • Saved to device on stop
              </p>

              <div>
                <Button
                  variant="danger"
                  size="md"
                  onClick={stopRecording}
                  leftIcon={<Square className="w-4 h-4 fill-current" />}
                >
                  Stop Recording
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
              <div className="flex items-center gap-3 text-left">
                <div className="w-12 h-12 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center shrink-0">
                  <Mic className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Ambient Audio Recorder</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Records audio locally in browser. Zero server transmission.
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={startRecording}
                leftIcon={<Mic className="w-4 h-4" />}
                className="shrink-0 w-full sm:w-auto"
              >
                Start Recording
              </Button>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* --- 2. EVIDENCE RECORDINGS LIST --- */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Saved Evidence ({recordings.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Stored locally on this device
            </span>
          </div>

          {recordings.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-slate-200/70 text-slate-500 flex items-center justify-center mx-auto mb-2">
                <FileAudio className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No recordings yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Captured ambient audio recordings will appear here. Tap Start Recording above to capture evidence.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {recordings.map((rec) => {
                const isThisPlaying = currentlyPlayingId === rec.id && isPlaying;
                return (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePlay(rec)}
                        title={isThisPlaying ? 'Pause' : 'Play'}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          isThisPlaying
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        {isThisPlaying ? (
                          <Pause className="w-5 h-5 fill-current" />
                        ) : (
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-slate-900 truncate">
                            {rec.name}
                          </h5>
                          <Badge variant="neutral" size="sm">
                            {rec.status || 'Saved locally'}
                          </Badge>
                          {rec.size && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {rec.size}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {rec.date} • {rec.duration} • {rec.time}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {rec.audioData && (
                        <a
                          href={rec.audioData}
                          download={`${(rec.name || 'evidence-audio').replace(/\s+/g, '_')}.webm`}
                          title="Download audio recording"
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rec.id)}
                        title="Delete recording"
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
