// app/api/assistant/route.ts
// -----------------------------------------------------------------------------
//  AI Assistant API with comprehensive database functions
import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// Performance optimizations
export const maxDuration = 30; // Limit function duration
export const runtime = 'nodejs';

// Simple in-memory cache for responses (consider Redis for production)
const responseCache = new Map();
const CACHE_TTL = 60000; // 1 minute

// Rate limiting
const userRequestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = userRequestCounts.get(userId) || [];
  
  // Remove old requests
  const recentRequests = userRequests.filter((time: number) => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  recentRequests.push(now);
  userRequestCounts.set(userId, recentRequests);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
//  TOOL DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'Get tasks for the current user with optional filters',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Filter by project ID' },
          completed: { type: 'boolean', description: 'Filter by completion status' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Filter by priority' },
          limit: { type: 'number', description: 'Maximum number of tasks to return', default: 10 }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_projects',
      description: 'Get projects for the current user and their organizations',
      parameters: {
        type: 'object',
        properties: {
          organizationId: { type: 'string', description: 'Filter by organization ID' },
          completed: { type: 'boolean', description: 'Filter by completion status' },
          limit: { type: 'number', description: 'Maximum number of projects to return', default: 10 }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_teams',
      description: 'Get organizations/teams the user is a member of',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum number of teams to return', default: 10 }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task for the user',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Task name' },
          description: { type: 'string', description: 'Task description' },
          projectId: { type: 'string', description: 'Project ID to associate with' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
          dueAt: { type: 'string', description: 'Due date in ISO format' },
          aiInstructions: { type: 'string', description: 'AI-specific instructions for the task' }
        },
        required: ['name', 'description', 'dueAt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_multiple_tasks',
      description: 'Create multiple tasks at once for the user',
      parameters: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Task name' },
                description: { type: 'string', description: 'Task description' },
                projectId: { type: 'string', description: 'Project ID to associate with' },
                priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
                dueAt: { type: 'string', description: 'Due date in ISO format' },
                aiInstructions: { type: 'string', description: 'AI-specific instructions for the task' }
              },
              required: ['name', 'description', 'dueAt']
            },
            description: 'Array of tasks to create'
          }
        },
        required: ['tasks']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_project',
      description: 'Create a new project',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name' },
          description: { type: 'string', description: 'Project description' },
          organizationId: { type: 'string', description: 'Organization ID to associate with' },
          dueAt: { type: 'string', description: 'Due date in ISO format' }
        },
        required: ['name', 'description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'suggest_task_improvements',
      description: 'Analyze a task and suggest improvements based on AI instructions and project context',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID to analyze' }
        },
        required: ['taskId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_schedule_context',
      description: 'Get user preferences, working hours, and existing tasks to help with intelligent scheduling',
      parameters: {
        type: 'object',
        properties: {
          includeTasks: { type: 'boolean', description: 'Include existing tasks in the response', default: true },
          daysAhead: { type: 'number', description: 'Number of days ahead to analyze', default: 14 }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_project_analytics',
      description: 'Get analytics and insights for a project including task completion rates and team performance',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID to analyze' }
        },
        required: ['projectId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_project_with_tasks',
      description: 'REQUIRED: Use this when user asks to create a project with tasks, or mentions creating both a project and tasks together. This creates both the project and all its tasks in one operation.',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'Project name' },
          projectDescription: { type: 'string', description: 'Project description' },
          organizationId: { type: 'string', description: 'Organization ID to associate with' },
          projectDueAt: { type: 'string', description: 'Project due date in ISO format' },
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Task name' },
                description: { type: 'string', description: 'Task description' },
                priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
                dueAt: { type: 'string', description: 'Due date in ISO format' },
                aiInstructions: { type: 'string', description: 'AI-specific instructions for the task' }
              },
              required: ['name', 'description', 'dueAt']
            },
            description: 'Array of tasks to create for this project'
          }
        },
        required: ['projectName', 'projectDescription', 'tasks']
      }
    }
  }
];

// Helper function to run tools in a loop until completion
async function runWithTools(
  messages: OpenAI.Chat.ChatCompletionMessageParam[], 
  openai: OpenAI, 
  model: string, 
  userId: string,
  maxIterations: number = 5
): Promise<OpenAI.Chat.ChatCompletionMessage> {
  let loopMessages = [...messages];
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`🔄 Tool execution loop iteration ${iteration}/${maxIterations}`);

    const resp = await openai.chat.completions.create({
      model,
      messages: loopMessages,
      tools: TOOLS,
      tool_choice: 'auto',
    });

    const choice = resp.choices[0];
    console.log(`📤 Response finish_reason: ${choice.finish_reason}, tool_calls count: ${choice.message.tool_calls?.length || 0}`);

    // No tool calls → final answer
    if (choice.finish_reason !== 'tool_calls' || !choice.message.tool_calls || choice.message.tool_calls.length === 0) {
      console.log('✅ No more tool calls, returning final response');
      return choice.message;
    }

    // Execute *all* tool calls returned in this turn
    const toolResults: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    console.log(`🔧 Executing ${choice.message.tool_calls.length} tool call(s):`);
    
    for (let i = 0; i < choice.message.tool_calls.length; i++) {
      const call = choice.message.tool_calls[i];
      const { name, arguments: argStr } = call.function;
      
      console.log(`  ${i + 1}. ${name} with args:`, argStr);
      
      try {
        const args = JSON.parse(argStr ?? '{}');
        const result = await callTool(name, args, userId);
        
        console.log(`  ✅ ${name} completed successfully`);
        
        toolResults.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      } catch (error) {
        console.error(`  ❌ ${name} failed:`, error);
        toolResults.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false 
          }),
        });
      }
    }

    // Add the assistant message + tool results and continue the loop
    loopMessages = [...loopMessages, choice.message, ...toolResults];
    console.log(`📝 Added ${toolResults.length} tool results to conversation, continuing loop...`);
  }

  console.warn(`⚠️ Reached maximum iterations (${maxIterations}), returning last response`);
  throw new Error(`Tool execution exceeded maximum iterations (${maxIterations})`);
}

// Router to call our tools

// Router to call our tools
async function callTool(fn: string, args: any, userId: string) {
  console.log('🔧 callTool invoked:', {
    function: fn,
    userId,
    args: JSON.stringify(args, null, 2)
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      orgMemberships: {
        include: { organization: true }
      },
      primaryOrg: true
    }
  });

  if (!user) {
    console.error('❌ User not found:', userId);
    throw new Error('User not found');
  }

  console.log('👤 User context:', {
    id: user.id,
    primaryOrgId: user.primaryOrgId,
    orgCount: user.orgMemberships.length
  });

  try {
    let result;
    switch (fn) {
      case 'get_tasks':
        console.log('📝 Executing getTasks...');
        result = await getTasks(userId, args);
        break;
      case 'get_projects':
        console.log('📋 Executing getProjects...');
        result = await getProjects(userId, args);
        break;
      case 'get_teams':
        console.log('👥 Executing getTeams...');
        result = await getTeams(userId, args);
        break;
      case 'create_task':
        console.log('📝 Executing createTask...');
        result = await createTask(userId, args);
        break;
      case 'create_multiple_tasks':
        console.log('📝 Executing createMultipleTasks...');
        result = await createMultipleTasks(userId, args);
        break;
      case 'create_project':
        console.log('📋 Executing createProject...');
        result = await createProject(userId, args);
        break;
      case 'suggest_task_improvements':
        console.log('💡 Executing suggestTaskImprovements...');
        result = await suggestTaskImprovements(userId, args);
        break;
      case 'get_user_schedule_context':
        console.log('📅 Executing getUserScheduleContext...');
        result = await getUserScheduleContext(userId, args);
        break;
      case 'get_project_analytics':
        console.log('📊 Executing getProjectAnalytics...');
        result = await getProjectAnalytics(userId, args);
        break;
      case 'create_project_with_tasks':
        console.log('📋📝 Executing createProjectWithTasks...');
        result = await createProjectWithTasks(userId, args);
        break;
      default:
        console.error('❌ Unknown function:', fn);
        throw new Error(`Unknown function: ${fn}`);
    }

    console.log('✅ Tool execution successful:', {
      function: fn,
      resultKeys: Object.keys(result || {}),
      hasMessage: !!(result && 'message' in result)
    });

    return result;
  } catch (error) {
    console.error(`💥 Tool execution failed for ${fn}:`, error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

// Tool implementations
async function getTasks(userId: string, args: any) {
  const limit = Math.min(args.limit || 10, 20); // Cap at 20 tasks
  
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      ...(args.projectId && { projectId: args.projectId }),
      ...(args.completed !== undefined && { completed: args.completed }),
      ...(args.priority && { priority: args.priority })
    },
    select: {
      id: true,
      name: true,
      description: true,
      completed: true,
      priority: true,
      dueAt: true,
      startsAt: true,
      createdAt: true,
      project: { 
        select: { 
          id: true, 
          name: true, 
          description: true 
        } 
      },
      tags: { 
        select: { 
          id: true, 
          name: true 
        },
        take: 3 // Limit tags
      }
    },
    orderBy: [
      { priority: 'desc' },
      { dueAt: 'asc' }
    ],
    take: limit
  });

  return {
    tasks,
    count: tasks.length,
    message: `Found ${tasks.length} task(s) matching your criteria${tasks.length === limit ? ' (showing first ' + limit + ')' : ''}`
  };
}

async function getProjects(userId: string, args: any) {
  const limit = Math.min(args.limit || 10, 15); // Cap at 15 projects
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      primaryOrgId: true,
      orgMemberships: { 
        select: { orgId: true },
        take: 10 // Limit org memberships
      }
    }
  });

  const orgIds = user?.orgMemberships.map(m => m.orgId) || [];

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { users: { some: { id: userId } } },
        { organizationId: { in: orgIds } }
      ],
      ...(args.organizationId && { organizationId: args.organizationId }),
      ...(args.completed !== undefined && { completed: args.completed })
    },
    select: {
      id: true,
      name: true,
      description: true,
      completed: true,
      dueAt: true,
      createdAt: true,
      organization: { 
        select: { 
          id: true, 
          name: true 
        } 
      },
      users: { 
        select: { 
          id: true, 
          firstName: true, 
          lastName: true 
        },
        take: 5 // Limit users per project
      },
      tasks: {
        select: {
          id: true,
          name: true,
          completed: true,
          priority: true,
          dueAt: true
        },
        take: 5, // Limit tasks per project
        orderBy: { dueAt: 'asc' }
      },
      goals: { 
        select: { 
          id: true, 
          name: true, 
          currentProgress: true, 
          totalTarget: true 
        },
        take: 3 // Limit goals per project
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return {
    projects,
    count: projects.length,
    message: `Found ${projects.length} project(s) you have access to${projects.length === limit ? ' (showing first ' + limit + ')' : ''}`
  };
}

async function getTeams(userId: string, args: any) {
  const organizations = await prisma.organization.findMany({
    where: {
      users: { some: { userId } }
    },
    include: {
      users: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      },
      projects: {
        select: {
          id: true,
          name: true,
          completed: true,
          _count: { select: { tasks: true } }
        }
      }
    },
    take: args.limit || 10
  });

  return {
    organizations,
    count: organizations.length,
    message: `You are a member of ${organizations.length} organization(s)`
  };
}

async function createTask(userId: string, args: any) {
  const task = await prisma.task.create({
    data: {
      name: args.name,
      description: args.description,
      userId,
      projectId: args.projectId || null,
      priority: args.priority || 'MEDIUM',
      startsAt: new Date(),
      dueAt: new Date(args.dueAt),
      aiInstructions: args.aiInstructions || null
    },
    include: {
      project: { select: { id: true, name: true } }
    }
  });

  return {
    task,
    message: `Successfully created task "${task.name}" ${task.project ? `in project "${task.project.name}"` : ''}`
  };
}

async function createMultipleTasks(userId: string, args: any) {
  const { tasks } = args;
  
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('Tasks array is required and must not be empty');
  }

  const createdTasks = [];
  const errors = [];

  for (const taskData of tasks) {
    try {
      const task = await prisma.task.create({
        data: {
          name: taskData.name,
          description: taskData.description,
          userId,
          projectId: taskData.projectId || null,
          priority: taskData.priority || 'MEDIUM',
          startsAt: new Date(),
          dueAt: new Date(taskData.dueAt),
          aiInstructions: taskData.aiInstructions || null
        },
        include: {
          project: { select: { id: true, name: true } }
        }
      });
      createdTasks.push(task);
    } catch (error) {
      errors.push({
        taskName: taskData.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  const successCount = createdTasks.length;
  const errorCount = errors.length;
  
  let message = `Successfully created ${successCount} task${successCount !== 1 ? 's' : ''}`;
  
  if (createdTasks.length > 0) {
    const taskList = createdTasks.map(task => 
      `• ${task.name} ${task.project ? `(${task.project.name})` : ''}`
    ).join('\n');
    message += `:\n${taskList}`;
  }
  
  if (errors.length > 0) {
    message += `\n\nErrors (${errorCount}):\n`;
    message += errors.map(err => `• ${err.taskName}: ${err.error}`).join('\n');
  }

  return {
    tasks: createdTasks,
    errors,
    successCount,
    errorCount,
    message
  };
}

async function createProject(userId: string, args: any) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { primaryOrgId: true }
  });

  const project = await prisma.project.create({
    data: {
      name: args.name,
      description: args.description,
      organizationId: args.organizationId || user?.primaryOrgId || null,
      dueAt: args.dueAt ? new Date(args.dueAt) : null,
      users: { connect: { id: userId } }
    },
    include: {
      organization: { select: { id: true, name: true } }
    }
  });

  return {
    project,
    message: `Successfully created project "${project.name}" ${project.organization ? `in organization "${project.organization.name}"` : ''}`
  };
}

async function createProjectWithTasks(userId: string, args: any) {
  console.log('🔧 createProjectWithTasks called with:', {
    userId,
    args: JSON.stringify(args, null, 2)
  });

  const { projectName, projectDescription, organizationId, projectDueAt, tasks } = args;
  
  if (!Array.isArray(tasks) || tasks.length === 0) {
    console.error('❌ Tasks array validation failed:', { tasks });
    throw new Error('Tasks array is required and must not be empty');
  }

  try {
    // First, verify user exists and get org info
    console.log('🔍 Looking up user:', userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        primaryOrgId: true,
        firstName: true,
        lastName: true
      }
    });

    console.log('👤 User found:', user);
    
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Create the project with detailed logging
    const projectData = {
      name: projectName,
      description: projectDescription,
      organizationId: organizationId || user?.primaryOrgId || null,
      dueAt: projectDueAt ? new Date(projectDueAt) : null,
      users: { connect: { id: userId } }
    };

    console.log('📋 Creating project with data:', JSON.stringify(projectData, null, 2));

    const project = await prisma.project.create({
      data: projectData,
      include: {
        organization: { select: { id: true, name: true } },
        users: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    console.log('✅ Project created successfully:', {
      id: project.id,
      name: project.name,
      organizationId: project.organizationId,
      userCount: project.users.length
    });

    // Then, create all the tasks for this project
    const createdTasks = [];
    const errors = [];

    console.log(`📝 Creating ${tasks.length} tasks for project ${project.id}...`);

    for (let i = 0; i < tasks.length; i++) {
      const taskData = tasks[i];
      try {
        console.log(`🔨 Creating task ${i + 1}/${tasks.length}:`, {
          name: taskData.name,
          dueAt: taskData.dueAt,
          priority: taskData.priority
        });

        const taskCreateData = {
          name: taskData.name,
          description: taskData.description,
          userId,
          projectId: project.id, // Associate with the newly created project
          priority: taskData.priority || 'MEDIUM',
          startsAt: new Date(),
          dueAt: new Date(taskData.dueAt),
          aiInstructions: taskData.aiInstructions || null
        };

        console.log('📝 Task create data:', JSON.stringify(taskCreateData, null, 2));

        const task = await prisma.task.create({
          data: taskCreateData,
          include: {
            project: { select: { id: true, name: true } }
          }
        });

        console.log('✅ Task created successfully:', {
          id: task.id,
          name: task.name,
          projectId: task.projectId
        });

        createdTasks.push(task);
      } catch (error) {
        console.error(`❌ Error creating task ${i + 1}:`, error);
        errors.push({
          taskName: taskData.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = createdTasks.length;
    const errorCount = errors.length;
    
    console.log('📊 Final results:', {
      projectId: project.id,
      successCount,
      errorCount,
      totalTasks: tasks.length
    });

    let message = `Successfully created project "${project.name}"`;
    if (project.organization) {
      message += ` in organization "${project.organization.name}"`;
    }
    message += ` with ${successCount} task${successCount !== 1 ? 's' : ''}`;
    
    if (createdTasks.length > 0) {
      const taskList = createdTasks.map(task => 
        `• ${task.name} (${task.priority} priority, due: ${new Date(task.dueAt).toLocaleDateString()})`
      ).join('\n');
      message += `:\n\n${taskList}`;
    }
    
    if (errors.length > 0) {
      message += `\n\nTask creation errors (${errorCount}):\n`;
      message += errors.map(err => `• ${err.taskName}: ${err.error}`).join('\n');
    }

    const result = {
      project,
      tasks: createdTasks,
      errors,
      successCount,
      errorCount,
      totalTasks: tasks.length,
      message
    };

    console.log('🎯 Returning result:', JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error('💥 Fatal error in createProjectWithTasks:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

async function getUserScheduleContext(userId: string, args: any) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      role: true,
      preferences: true,
      startTime: true,
      endTime: true,
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const context: {
    user: {
      name: string;
      jobTitle: string | null;
      role: string | null;
      workingHours: {
        start: string;
        end: string;
      };
      preferences: any;
    };
    existingTasks: Array<{
      id: string;
      name: string;
      description: string;
      priority: string;
      dueAt: Date;
      completed: boolean;
      project: string;
      estimatedHours: number;
    }>;
    schedule: {
      busyDays: Array<{ day: string; taskCount: number }>;
      availableSlots: string[];
      workload: string;
    };
  } = {
    user: {
      name: `${user.firstName} ${user.lastName}`,
      jobTitle: user.jobTitle,
      role: user.role,
      workingHours: {
        start: user.startTime || '09:00',
        end: user.endTime || '17:00'
      },
      preferences: user.preferences || {}
    },
    existingTasks: [],
    schedule: {
      busyDays: [],
      availableSlots: [],
      workload: 'normal'
    }
  };

  if (args.includeTasks !== false) {
    const daysAhead = args.daysAhead || 14;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        dueAt: {
          gte: new Date(),
          lte: endDate
        }
      },
      include: {
        project: { select: { id: true, name: true } }
      },
      orderBy: { dueAt: 'asc' }
    });

    context.existingTasks = tasks.map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
      priority: task.priority,
      dueAt: task.dueAt,
      completed: task.completed,
      project: task.project?.name || 'Personal',
      estimatedHours: extractEstimatedHours(task.description, task.aiInstructions)
    }));

    // Analyze workload
    const incompleteTasks = tasks.filter(t => !t.completed);
    const highPriorityTasks = incompleteTasks.filter(t => t.priority === 'HIGH');
    const tasksThisWeek = incompleteTasks.filter(t => {
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return new Date(t.dueAt) <= weekFromNow;
    });

    context.schedule.workload = 
      highPriorityTasks.length > 5 ? 'heavy' :
      tasksThisWeek.length > 10 ? 'busy' :
      tasksThisWeek.length < 3 ? 'light' : 'normal';

    // Group tasks by day to identify busy periods
    const tasksByDay = tasks.reduce((acc, task) => {
      const day = new Date(task.dueAt).toDateString();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    context.schedule.busyDays = Object.entries(tasksByDay)
      .filter(([_, count]) => count > 3)
      .map(([day, count]) => ({ day, taskCount: count }));

    // Suggest available time slots based on working hours and existing tasks
    context.schedule.availableSlots = generateAvailableSlots(
      user.startTime || '09:00',
      user.endTime || '17:00',
      tasks
    );
  }

  return {
    ...context,
    message: `Retrieved schedule context for ${user.firstName}. Current workload: ${context.schedule.workload}. ${context.existingTasks.length} tasks in the next ${args.daysAhead || 14} days.`
  };
}

function extractEstimatedHours(description: string, aiInstructions: string | null): number {
  // Look for time estimates in description or AI instructions
  const text = `${description} ${aiInstructions || ''}`.toLowerCase();
  const hourMatch = text.match(/(\d+)\s*hours?/);
  const minMatch = text.match(/(\d+)\s*minutes?/);
  
  if (hourMatch) return parseInt(hourMatch[1]);
  if (minMatch) return Math.ceil(parseInt(minMatch[1]) / 60);
  
  // Default estimates based on common task patterns
  if (text.includes('meeting') || text.includes('call')) return 1;
  if (text.includes('review') || text.includes('check')) return 0.5;
  if (text.includes('research') || text.includes('analyze')) return 2;
  if (text.includes('develop') || text.includes('build') || text.includes('create')) return 4;
  
  return 1; // Default 1 hour
}

function generateAvailableSlots(startTime: string, endTime: string, tasks: any[]): string[] {
  const slots = [];
  const workStart = parseInt(startTime.split(':')[0]);
  const workEnd = parseInt(endTime.split(':')[0]);
  
  // Simple algorithm: suggest morning, midday, and afternoon slots
  // that don't conflict with existing task patterns
  const busyHours = tasks.map(task => new Date(task.dueAt).getHours());
  
  for (let hour = workStart; hour < workEnd; hour += 2) {
    if (!busyHours.includes(hour)) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00-${(hour + 2).toString().padStart(2, '0')}:00`;
      slots.push(timeSlot);
    }
  }
  
  return slots.slice(0, 3); // Return top 3 available slots
}

async function suggestTaskImprovements(userId: string, args: any) {
  const task = await prisma.task.findFirst({
    where: {
      id: args.taskId,
      userId
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          tasks: {
            select: {
              id: true,
              name: true,
              description: true,
              completed: true,
              priority: true
            },
            take: 5
          }
        }
      },
      tags: { select: { name: true } }
    }
  });

  if (!task) {
    throw new Error('Task not found or you do not have access to it');
  }

  const suggestions = {
    task,
    improvements: [
      task.aiInstructions ? null : "Consider adding AI instructions to help with automation",
      task.priority === 'LOW' && task.dueAt < new Date(Date.now() + 24 * 60 * 60 * 1000) ? 
        "Task due soon but marked as low priority - consider increasing priority" : null,
      task.project && task.project.tasks.filter(t => !t.completed).length > 5 ? 
        "Project has many incomplete tasks - consider breaking down or prioritizing" : null,
      !task.project ? "Consider associating this task with a project for better organization" : null
    ].filter(Boolean),
    projectContext: task.project ? {
      name: task.project.name,
      description: task.project.description,
      totalTasks: task.project.tasks.length,
      completedTasks: task.project.tasks.filter(t => t.completed).length
    } : null
  };

  return {
    ...suggestions,
    message: `Analysis complete for task "${task.name}". Found ${suggestions.improvements.length} potential improvement(s).`
  };
}

async function getProjectAnalytics(userId: string, args: any) {
  const project = await prisma.project.findFirst({
    where: {
      id: args.projectId,
      OR: [
        { users: { some: { id: userId } } },
        { organization: { users: { some: { userId } } } }
      ]
    },
    include: {
      tasks: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } }
        }
      },
      users: { select: { id: true, firstName: true, lastName: true } },
      goals: { select: { name: true, currentProgress: true, totalTarget: true } }
    }
  });

  if (!project) {
    throw new Error('Project not found or you do not have access to it');
  }

  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter(t => t.completed).length;
  const overdueTasks = project.tasks.filter(t => !t.completed && t.dueAt < new Date()).length;
  const highPriorityTasks = project.tasks.filter(t => !t.completed && t.priority === 'HIGH').length;

  const userStats = project.users.map(user => {
    const userTasks = project.tasks.filter(t => t.userId === user.id);
    const userCompleted = userTasks.filter(t => t.completed).length;
    return {
      user: `${user.firstName} ${user.lastName}`,
      totalTasks: userTasks.length,
      completedTasks: userCompleted,
      completionRate: userTasks.length > 0 ? Math.round((userCompleted / userTasks.length) * 100) : 0
    };
  });

  const analytics = {
    project: {
      id: project.id,
      name: project.name,
      description: project.description
    },
    taskStats: {
      total: totalTasks,
      completed: completedTasks,
      overdue: overdueTasks,
      highPriority: highPriorityTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    },
    teamStats: userStats,
    goals: project.goals.map(g => ({
      name: g.name,
      progress: g.currentProgress,
      target: g.totalTarget,
      completionRate: Math.round((g.currentProgress / g.totalTarget) * 100)
    })),
    insights: [
      completedTasks / totalTasks > 0.8 ? "Excellent completion rate! Team is performing very well." : null,
      overdueTasks > 0 ? `${overdueTasks} task(s) are overdue and need immediate attention.` : null,
      highPriorityTasks > 3 ? `${highPriorityTasks} high-priority tasks - consider redistributing workload.` : null,
      userStats.some(u => u.completionRate < 50) ? "Some team members may need additional support." : null
    ].filter(Boolean)
  };

  return {
    ...analytics,
    message: `Analytics generated for project "${project.name}". Completion rate: ${analytics.taskStats.completionRate}%`
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/assistant
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // 1️⃣  Auth *inside* the request scope
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  // Rate limiting
  if (!checkRateLimit(userId)) {
    return NextResponse.json({ 
      error: 'Rate limit exceeded. Please try again in a minute.' 
    }, { status: 429 });
  }

  // 2️⃣  Look up the user's personal OpenAI key and model preference
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { openAIKey: true, openAIModel: true },
  });

  if (!dbUser?.openAIKey && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ 
      error: 'OpenAI API key not configured. Please add your OpenAI key in settings.' 
    }, { status: 400 });
  }

  // 4️⃣  Read the prompt
  const prompt = req.nextUrl.searchParams.get('q') ?? 'Hello! How can I help you manage your tasks and projects today?';

  // Check cache first
  const cacheKey = `${userId}:${prompt}`;
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.response);
  }

  // 3️⃣  Create the OpenAI client for *this* request
  const openai = new OpenAI({
    apiKey: dbUser?.openAIKey || process.env.OPENAI_API_KEY!,
    timeout: 20000, // 20 second timeout
  });

  // 5️⃣  Get current date information for context
  const currentDate = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'America/New_York' 
  };
  const formattedDate = currentDate.toLocaleDateString('en-US', dateOptions);
  const timeStr = currentDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'America/New_York'
  });

  try {
    // Use the new runWithTools function to handle chained tool calls
    const systemMessage = {
      role: 'system' as const,
      content: `You are a productivity AI assistant that helps users manage their tasks, projects, and teams. 
      You have access to their database and can:
      - View and analyze tasks, projects, and team data
      - Create single tasks using create_task or multiple tasks at once using create_multiple_tasks
      - Create new projects using create_project
      - Create a project with tasks in one operation using create_project_with_tasks (USE THIS when users ask to "create a project and add tasks" or similar)
      - Get user schedule context including preferences, working hours, and existing tasks
      - Provide intelligent scheduling based on workload and availability
      - Offer productivity tips and project management advice
      
      CURRENT DATE AND TIME: ${formattedDate} at ${timeStr}
      
      IMPORTANT: When users ask you to create projects or tasks, you MUST actually call the appropriate function to create them in the database. Do not just describe what you would create - actually create them!
      
      WHEN TO USE WHICH FUNCTION:
      - If user asks to "create a project with tasks", "create a project and add tasks", or describes a project with multiple tasks: use create_project_with_tasks
      - If user asks to create multiple tasks without a specific project: use create_multiple_tasks
      - If user asks to create a single task: use create_task
      - If user asks to create just a project without specific tasks: use create_project
      
      INTELLIGENT SCHEDULING:
      When creating projects or multiple tasks, ALWAYS first call get_user_schedule_context to understand:
      - User's working hours and preferences
      - Current workload and existing tasks
      - Busy periods and available time slots
      - Task priorities and deadlines
      
      Use this context to:
      - Schedule tasks during available time slots
      - Avoid overloading busy days
      - Respect user's working hours
      - Consider task complexity and user's current workload
      - Space out similar types of tasks
      - Prioritize based on existing deadlines
      
      For due dates, parse natural language using the current date as reference:
      - "today" = ${formattedDate}
      - "tomorrow" = the day after today
      - "Wednesday" = the next Wednesday (if today is Wednesday, use next Wednesday)
      - "next Friday" = the Friday of next week
      - "in 2 weeks" = 2 weeks from today
      - If no date specified, schedule based on available slots and workload
      
      ALWAYS call the function to actually create what the user requests. Be helpful, concise, and actionable in your responses.`
    };

    const userMessage = { role: 'user' as const, content: prompt };
      const finalMessage = await runWithTools(
      [systemMessage, userMessage], 
      openai, 
      dbUser?.openAIModel || 'gpt-4o-mini', 
      userId,
      3 // Reduced from 5 to limit iterations
    );

    // Cache successful responses
    responseCache.set(cacheKey, {
      response: finalMessage,
      timestamp: Date.now()
    });

    // Clean up old cache entries periodically
    if (responseCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of responseCache.entries()) {
        if (now - value.timestamp > CACHE_TTL * 2) {
          responseCache.delete(key);
        }
      }
    }

    return NextResponse.json(finalMessage);
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    
    if (error?.error?.code === 'invalid_api_key') {
      return NextResponse.json({ 
        error: 'Invalid OpenAI API key. Please check your API key in settings.' 
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to process your request. Please try again.' 
    }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/assistant (for conversation context)
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { messages = [], prompt } = body;

  // Ensure messages is an array
  const conversationMessages = Array.isArray(messages) ? messages : [];

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { openAIKey: true, openAIModel: true },
  });

  if (!dbUser?.openAIKey && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ 
      error: 'OpenAI API key not configured. Please add your OpenAI key in settings.' 
    }, { status: 400 });
  }

  const openai = new OpenAI({
    apiKey: dbUser?.openAIKey || process.env.OPENAI_API_KEY!,
  });

  try {
    // Get current date information for context
    const currentDate = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'America/New_York' 
    };
    const formattedDate = currentDate.toLocaleDateString('en-US', dateOptions);
    const timeStr = currentDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/New_York'
    });

    const systemMessage = {
      role: 'system' as const,
      content: `You are a productivity AI assistant that helps users manage their tasks, projects, and teams. 
      You have access to their database and can:
      - View and analyze tasks, projects, and team data
      - Create single tasks using create_task or multiple tasks at once using create_multiple_tasks
      - Create new projects using create_project
      - Create a project with tasks in one operation using create_project_with_tasks (USE THIS when users ask to "create a project and add tasks" or similar)
      - Get user schedule context including preferences, working hours, and existing tasks
      - Provide intelligent scheduling based on workload and availability
      - Offer productivity tips and project management advice
      
      CURRENT DATE AND TIME: ${formattedDate} at ${timeStr}
      
      IMPORTANT: When users ask you to create projects or tasks, you MUST actually call the appropriate function to create them in the database. Do not just describe what you would create - actually create them!
      
      WHEN TO USE WHICH FUNCTION:
      - If user asks to "create a project with tasks", "create a project and add tasks", or describes a project with multiple tasks: use create_project_with_tasks
      - If user asks to create multiple tasks without a specific project: use create_multiple_tasks
      - If user asks to create a single task: use create_task
      - If user asks to create just a project without specific tasks: use create_project
      
      INTELLIGENT SCHEDULING:
      When creating projects or multiple tasks, ALWAYS first call get_user_schedule_context to understand:
      - User's working hours and preferences
      - Current workload and existing tasks
      - Busy periods and available time slots
      - Task priorities and deadlines
      
      Use this context to:
      - Schedule tasks during available time slots
      - Avoid overloading busy days
      - Respect user's working hours
      - Consider task complexity and user's current workload
      - Space out similar types of tasks
      - Prioritize based on existing deadlines
      
      For due dates, parse natural language using the current date as reference:
      - "today" = ${formattedDate}
      - "tomorrow" = the day after today
      - "Wednesday" = the next Wednesday (if today is Wednesday, use next Wednesday)
      - "next Friday" = the Friday of next week
      - "in 2 weeks" = 2 weeks from today
      - If no date specified, schedule based on available slots and workload
      
      ALWAYS call the function to actually create what the user requests. Be helpful, concise, and actionable in your responses.`
    };

    console.log('🤖 Starting AI assistant call with:', {
      userId,
      promptLength: prompt.length,
      messageCount: conversationMessages.length,
      currentDate: formattedDate
    });

    const finalMessage = await runWithTools(
      [systemMessage, ...conversationMessages, { role: 'user', content: prompt }], 
      openai, 
      dbUser?.openAIModel || 'gpt-4o-mini', 
      userId
    );

    console.log('✅ Final response generated');
    return NextResponse.json(finalMessage);
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    
    if (error?.error?.code === 'invalid_api_key') {
      return NextResponse.json({ 
        error: 'Invalid OpenAI API key. Please check your API key in settings.' 
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to process your request. Please try again.' 
    }, { status: 500 });
  }
}
