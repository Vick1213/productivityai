import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                preferences: true,
                startTime: true,
                endTime: true,
                openAIKey: true,
                openAIModel: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Extract settings from preferences JSON or use defaults
        const settings = user.preferences as any || {};

        return NextResponse.json({
            preferences: settings.preferences || '',
            workStart: user.startTime || '09:00',
            workEnd: user.endTime || '17:00',
            openaiKey: user.openAIKey ? '••••••••' : '', // Mask the key
            openaiModel: user.openAIModel || 'gpt-4o-mini',
            enableBeta: settings.enableBeta || false,
            timeZone: settings.timeZone || 'America/New_York',
            taskDuration: settings.taskDuration || 60, // Default 1 hour
            breakDuration: settings.breakDuration || 15, // Default 15 minutes
            maxTasksPerDay: settings.maxTasksPerDay || 8,
            preferredTaskTypes: settings.preferredTaskTypes || ['development', 'meetings', 'review'],
            avoidTimeSlots: settings.avoidTimeSlots || [] // e.g., ['12:00-13:00'] for lunch
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    try {
        const { 
            preferences, 
            workStart, 
            workEnd, 
            openaiKey, 
            openaiModel, 
            enableBeta,
            timeZone,
            taskDuration,
            breakDuration,
            maxTasksPerDay,
            preferredTaskTypes,
            avoidTimeSlots
        } = await req.json();

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Prepare update data
        const updateData: any = {
            startTime: workStart,
            endTime: workEnd,
            preferences: {
                preferences,
                enableBeta,
                timeZone,
                taskDuration,
                breakDuration,
                maxTasksPerDay,
                preferredTaskTypes,
                avoidTimeSlots
            }
        };

        // Only update OpenAI key if provided (not masked)
        if (openaiKey && openaiKey !== '••••••••') {
            updateData.openAIKey = openaiKey;
        }

        // Update OpenAI model if provided
        if (openaiModel) {
            updateData.openAIModel = openaiModel;
        }

        // Update user preferences
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        return NextResponse.json({ 
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}