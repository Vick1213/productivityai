'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AudioTaskCreatorProps {
  onTranscription: (text: string) => void;
}

export function AudioTaskCreator({ onTranscription }: AudioTaskCreatorProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Process the audio
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Create FormData to send audio file to our API
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      
      // Send to our speech-to-text API endpoint
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process audio');
      }
      
      if (data.transcription) {
        onTranscription(data.transcription);
      } else {
        throw new Error('No transcription received');
      }
      
    } catch (error) {
      console.error('Error processing audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Check if it's an API key error and provide helpful guidance
      if (errorMessage.includes('OpenAI') && errorMessage.includes('key')) {
        onTranscription(`⚠️ ${errorMessage} You can add your OpenAI API key in Settings to enable voice tasks.`);
      } else {
        onTranscription(`❌ Speech processing failed: ${errorMessage}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h3 className="font-medium text-purple-900 mb-1">Voice Task Creator</h3>
            <p className="text-sm text-purple-700">
              {isRecording 
                ? "🎙️ Recording... Speak clearly about your task" 
                : isProcessing 
                ? "🔄 Converting speech to text..." 
                : "🎯 Record your voice to create a task instantly"
              }
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {audioUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const audio = new Audio(audioUrl);
                  audio.play();
                }}
                className="gap-1"
              >
                <Volume2 className="h-3 w-3" />
                Play
              </Button>
            )}
            
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`gap-2 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  {isProcessing ? 'Processing...' : 'Start Recording'}
                </>
              )}
            </Button>
          </div>
        </div>
        
        {isRecording && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex space-x-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1 h-4 bg-red-500 rounded animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <span className="text-sm text-red-600 font-medium">Recording in progress...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
