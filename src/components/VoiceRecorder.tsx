import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Play, Pause, Copy, Trash2, Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {}

const VoiceRecorder: React.FC<VoiceRecorderProps> = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioURL, setAudioURL] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript + ' ');
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Recognition Error",
          description: "Could not process speech. Please try again.",
          variant: "destructive",
        });
      };
    } else {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [toast]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start speech recognition
      if (recognitionRef.current) {
        setIsTranscribing(true);
        recognitionRef.current.start();
      }
      
      toast({
        title: "Recording Started",
        description: "Speak clearly for the best transcription results.",
      });
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      toast({
        title: "Recording Stopped",
        description: `Recording completed (${formatTime(recordingTime)})`,
      });
    }
  };

  const playAudio = () => {
    if (audioURL && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const clearRecording = () => {
    setAudioURL('');
    setTranscript('');
    setRecordingTime(0);
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    toast({
      title: "Recording Cleared",
      description: "Ready for a new recording.",
    });
  };

  const copyTranscript = async () => {
    if (transcript.trim()) {
      try {
        await navigator.clipboard.writeText(transcript.trim());
        toast({
          title: "Copied!",
          description: "Transcript copied to clipboard.",
        });
      } catch (error) {
        toast({
          title: "Copy Failed",
          description: "Could not copy to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  const downloadTranscript = () => {
    if (transcript.trim()) {
      const blob = new Blob([transcript.trim()], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript-${new Date().toISOString().slice(0, 19)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded!",
        description: "Transcript saved as text file.",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if it's an audio file
      if (!file.type.startsWith('audio/')) {
        toast({
          title: "Invalid File",
          description: "Please select an audio file.",
          variant: "destructive",
        });
        return;
      }

      const url = URL.createObjectURL(file);
      setAudioURL(url);
      setTranscript('');
      setRecordingTime(0);
      
      toast({
        title: "File Uploaded",
        description: `${file.name} ready for playback. Note: Live transcription works best with recordings.`,
      });
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Made for Teams: Speech to Text Tool
        </h1>
        <p className="text-muted-foreground">
          Record your voice or upload audio files to get instant text transcripts
        </p>
      </div>

      {/* Recording Controls */}
      <Card className="shadow-card">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {isRecording ? <MicOff className="text-recording" /> : <Mic />}
            Recording Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            {/* Recording Timer */}
            {(isRecording || recordingTime > 0) && (
              <div className="text-center">
                <Badge variant={isRecording ? "destructive" : "secondary"} className="text-lg px-4 py-2">
                  {formatTime(recordingTime)}
                </Badge>
                {isRecording && (
                  <p className="text-sm text-muted-foreground mt-2">Recording in progress...</p>
                )}
              </div>
            )}

            {/* Recording and Upload Buttons */}
            <div className="flex flex-col items-center space-y-4">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "recording" : "hero"}
                size="lg"
                className="w-32 h-32 rounded-full text-lg font-semibold"
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-8 h-8" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="w-8 h-8" />
                    Record
                  </>
                )}
              </Button>
              
              <div className="text-sm text-muted-foreground">or</div>
              
              <Button
                onClick={triggerFileUpload}
                variant="outline"
                size="lg"
                className="w-40"
                disabled={isRecording}
              >
                <Upload className="w-5 h-5" />
                Upload Audio
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>

            {/* Transcription Status */}
            {isTranscribing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-wave" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-wave" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-wave" style={{ animationDelay: '300ms' }}></div>
                </div>
                Transcribing...
              </div>
            )}
          </div>

          {/* Audio Playback */}
          {audioURL && (
            <div className="flex justify-center space-x-2">
              <Button onClick={playAudio} variant="outline">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button onClick={clearRecording} variant="outline">
                <Trash2 className="w-4 h-4" />
                Clear
              </Button>
            </div>
          )}

          <audio
            ref={audioRef}
            src={audioURL}
            onEnded={() => setIsPlaying(false)}
            style={{ display: 'none' }}
          />
        </CardContent>
      </Card>

      {/* Transcript Display */}
      {transcript && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Transcript
              <div className="flex space-x-2">
                <Button onClick={copyTranscript} variant="outline" size="sm">
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
                <Button onClick={downloadTranscript} variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 min-h-[120px] whitespace-pre-wrap leading-relaxed">
              {transcript || 'Your transcript will appear here...'}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default VoiceRecorder;