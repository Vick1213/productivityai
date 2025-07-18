// app/api/assistant/route.ts
// -----------------------------------------------------------------------------
//  AI Assistant API with comprehensive database functions
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

// ─────────────────────────────────────────────────────────────────────────────
//  FUNCTION DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const FUNCTIONS: OpenAI.Chat.ChatCompletionCreateParams.Function[] = [
  {
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
  },
  {
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
  },
  {
    name: 'get_teams',
    description: 'Get organizations/teams the user is a member of',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of teams to return', default: 10 }
      }
    }
  },
  {
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
  },
  {
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
  },
  {
    name: 'suggest_task_improvements',
    description: 'Analyze a task and suggest improvements based on AI instructions and project context',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to analyze' }
      },
      required: ['taskId']
    }
  },
  {
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
];

// Router to call our tools
async function callTool(fn: string, args: any, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      orgMemberships: {
        include: { organization: true }
      },
      primaryOrg: true
    }
  });

  if (!user) throw new Error('User not found');

  switch (fn) {
    case 'get_tasks':
      return await getTasks(userId, args);
    case 'get_projects':
      return await getProjects(userId, args);
    case 'get_teams':
      return await getTeams(userId, args);
    case 'create_task':
      return await createTask(userId, args);
    case 'create_project':
      return await createProject(userId, args);
    case 'suggest_task_improvements':
      return await suggestTaskImprovements(userId, args);
    case 'get_project_analytics':
      return await getProjectAnalytics(userId, args);
    default:
      throw new Error(`Unknown function: ${fn}`);
  }
}

// Tool implementations
async function getTasks(userId: string, args: any) {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      ...(args.projectId && { projectId: args.projectId }),
      ...(args.completed !== undefined && { completed: args.completed }),
      ...(args.priority && { priority: args.priority })
    },
    include: {
      project: { select: { id: true, name: true, description: true } },
      tags: { select: { id: true, name: true } },
      subtasks: { select: { id: true, name: true, completed: true } }
    },
    orderBy: [
      { priority: 'desc' },
      { dueAt: 'asc' }
    ],
    take: args.limit || 10
  });

  return {
    tasks,
    count: tasks.length,
    message: `Found ${tasks.length} task(s) matching your criteria`
  };
}

async function getProjects(userId: string, args: any) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      orgMemberships: { select: { orgId: true } }
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
    include: {
      organization: { select: { id: true, name: true } },
      users: { select: { id: true, firstName: true, lastName: true } },
      tasks: {
        select: {
          id: true,
          name: true,
          completed: true,
          priority: true,
          dueAt: true
        }
      },
      goals: { select: { id: true, name: true, currentProgress: true, totalTarget: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: args.limit || 10
  });

  return {
    projects,
    count: projects.length,
    message: `Found ${projects.length} project(s) you have access to`
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

  // 3️⃣  Create the OpenAI client for *this* request
  const openai = new OpenAI({
    apiKey: dbUser?.openAIKey || process.env.OPENAI_API_KEY!,
  });

  // 4️⃣  Read the prompt
  const prompt = req.nextUrl.searchParams.get('q') ?? 'Hello! How can I help you manage your tasks and projects today?';

  try {
    // 5️⃣  First completion with tool defs
    const completion = await openai.chat.completions.create({
      model: dbUser?.openAIModel || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a productivity AI assistant that helps users manage their tasks, projects, and teams. 
          You have access to their database and can:
          - View and analyze tasks, projects, and team data
          - Create new tasks and projects
          - Provide insights and suggestions based on AI instructions and project context
          - Offer productivity tips and project management advice
          
          Be helpful, concise, and actionable in your responses. When suggesting improvements, be specific and practical.`
        },
        { role: 'user', content: prompt }
      ],
      functions: FUNCTIONS,
      function_call: 'auto',
    });

    const [choice] = completion.choices;

    // 6️⃣  If the model wants to call a function → execute → follow-up
    if (choice.finish_reason === 'function_call' && choice.message.function_call) {
      const { name, arguments: argStr } = choice.message.function_call;
      const args = JSON.parse(argStr ?? '{}');

      let toolResult;
      try {
        toolResult = await callTool(name, args, userId);
      } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 400 });
      }

      const followUp = await openai.chat.completions.create({
        model: dbUser?.openAIModel || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a productivity AI assistant. Provide helpful, actionable responses based on the data retrieved.`
          },
          { role: 'user', content: prompt },
          choice.message,
          { role: 'function', name, content: JSON.stringify(toolResult) },
        ],
      });

      return NextResponse.json(followUp.choices[0].message);
    }

    // 7️⃣  Plain answer
    return NextResponse.json(choice.message);
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
    const systemMessage = {
      role: 'system' as const,
      content: `You are a productivity AI assistant that helps users manage their tasks, projects, and teams. 
      You have access to their database and can:
      - View and analyze tasks, projects, and team data
      - Create new tasks and projects
      - Provide insights and suggestions based on AI instructions and project context
      - Offer productivity tips and project management advice
      
      Be helpful, concise, and actionable in your responses. When suggesting improvements, be specific and practical.`
    };

    const completion = await openai.chat.completions.create({
      model: dbUser?.openAIModel || 'gpt-4o-mini',
      messages: [systemMessage, ...conversationMessages, { role: 'user', content: prompt }],
      functions: FUNCTIONS,
      function_call: 'auto',
    });

    const [choice] = completion.choices;

    if (choice.finish_reason === 'function_call' && choice.message.function_call) {
      const { name, arguments: argStr } = choice.message.function_call;
      const args = JSON.parse(argStr ?? '{}');

      let toolResult;
      try {
        toolResult = await callTool(name, args, userId);
      } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 400 });
      }

      const followUp = await openai.chat.completions.create({
        model: dbUser?.openAIModel || 'gpt-4o-mini',
        messages: [
          systemMessage,
          ...messages,
          { role: 'user', content: prompt },
          choice.message,
          { role: 'function', name, content: JSON.stringify(toolResult) },
        ],
      });

      return NextResponse.json(followUp.choices[0].message);
    }

    return NextResponse.json(choice.message);
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
