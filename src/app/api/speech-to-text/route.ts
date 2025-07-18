// app/api/speech-to-text/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's OpenAI key
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { openAIKey: true }
    });

    if (!user?.openAIKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add your OpenAI key in settings.' },
        { status: 400 }
      );
    }

    // Get the audio file from form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Initialize OpenAI with user's key
    const openai = new OpenAI({
      apiKey: user.openAIKey,
    });

    // Convert File to Buffer for OpenAI API
    const audioBuffer = await audioFile.arrayBuffer();
    const audioFile_openai = new File([audioBuffer], 'audio.wav', {
      type: 'audio/wav',
    });

    // Use OpenAI Whisper to transcribe the audio
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile_openai,
      model: 'whisper-1',
      response_format: 'text',
      language: 'en', // You can make this configurable
    });

    return NextResponse.json({
      transcription: transcription,
      success: true
    });

  } catch (error) {
    console.error('Speech-to-text error:', error);
    
    // Handle OpenAI specific errors
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key. Please check your API key in settings.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process audio. Please try again.' },
      { status: 500 }
    );
  }
}
