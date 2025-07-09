# AI Productivity Assistant

This document describes the AI-powered productivity assistant integrated into the application. The assistant uses OpenAI's GPT models to help users manage tasks, projects, and teams more effectively.

## Features

### Core Capabilities

1. **Task Management**
   - View and filter tasks by project, completion status, and priority
   - Create new tasks with AI-generated suggestions
   - Analyze tasks and suggest improvements based on context
   - Generate AI instructions for task automation

2. **Project Analytics**
   - Generate comprehensive project analytics and insights
   - Track completion rates and team performance
   - Identify bottlenecks and areas for improvement
   - Monitor project goals and progress

3. **Team Insights**
   - View team members and their contributions
   - Analyze workload distribution
   - Identify team members who may need support
   - Track organizational performance

4. **Smart Suggestions**
   - Context-aware task recommendations
   - Project optimization suggestions
   - Priority adjustments based on deadlines
   - Workflow improvement ideas

### AI Functions Available

The assistant has access to the following database functions:

#### Task Functions
- `get_tasks` - Retrieve user tasks with filtering options
- `create_task` - Create new tasks with AI instructions
- `suggest_task_improvements` - Analyze and suggest task improvements

#### Project Functions
- `get_projects` - Retrieve user projects and organization projects
- `create_project` - Create new projects
- `get_project_analytics` - Generate detailed project analytics

#### Team Functions
- `get_teams` - Retrieve user's organizations and team information

## Configuration

### OpenAI API Key Setup

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Navigate to Dashboard → Settings
4. Enter your API key in the "OpenAI API Key" field
5. Select your preferred AI model (GPT-4o Mini recommended)
6. Save settings

### AI Model Options

- **GPT-4o Mini** (Recommended) - Fast, cost-effective, suitable for most tasks
- **GPT-4o** (Advanced) - More sophisticated reasoning, higher cost
- **GPT-3.5 Turbo** (Fast) - Quick responses, lower cost, basic functionality

### Personal Instructions

You can customize how the AI assistant behaves by adding personal instructions in the settings:

```
Examples:
- "Focus on actionable insights"
- "Prefer concise responses"
- "Always include task priorities in suggestions"
- "Emphasize deadlines and time management"
```

## Usage Examples

### Basic Queries

**View Tasks:**
```
"Show me my overdue tasks"
"What are my high-priority tasks?"
"List tasks for the Marketing project"
```

**Create Tasks:**
```
"Create a task for tomorrow's client meeting"
"Add a high-priority task to finish the quarterly report by Friday"
"Create a task for reviewing the project proposal with AI instructions for scheduling follow-ups"
```

**Project Analytics:**
```
"Analyze the performance of my current project"
"How is my team doing on the Website Redesign project?"
"Show me completion rates for all my projects"
```

### Advanced Queries

**Task Optimization:**
```
"Suggest improvements for my high-priority tasks"
"Analyze task [ID] and recommend optimizations"
"Help me prioritize my tasks for this week"
```

**Team Management:**
```
"Show me team workload distribution"
"Which team members might need additional support?"
"Generate a team performance report"
```

**Project Insights:**
```
"What projects are behind schedule?"
"Give me insights on project bottlenecks"
"Recommend project management improvements"
```

## API Integration

### Assistant Endpoint

**GET /api/assistant**
- Single query interaction
- Query parameter: `q` (the user's question/request)

**POST /api/assistant**
- Conversation with context
- Body: `{ messages: [], prompt: string }`

### Database Schema Integration

The AI assistant leverages the following database models:

#### User Model
```typescript
{
  openAIKey: string       // User's personal OpenAI API key
  openAIModel: string     // Preferred AI model
  preferences: Json       // AI behavior preferences
}
```

#### Task Model
```typescript
{
  name: string
  description: string
  aiInstructions: string  // AI-specific instructions
  priority: Priority
  dueAt: DateTime
  projectId: string
}
```

#### Project Model
```typescript
{
  name: string
  description: string
  tasks: Task[]
  goals: Goal[]
  users: User[]
}
```

## Security Considerations

1. **API Key Storage**: User API keys are stored securely in the database
2. **Access Control**: Users can only access their own data and organization data they're members of
3. **Data Privacy**: AI requests include only necessary context, not sensitive personal information
4. **Rate Limiting**: Consider implementing rate limiting for API calls to prevent abuse

## Error Handling

The assistant handles various error scenarios:

- **Invalid API Key**: Clear error message with instructions to update settings
- **Rate Limiting**: Graceful degradation with retry suggestions
- **Network Issues**: Timeout handling with appropriate user feedback
- **Permission Errors**: Clear messages about data access limitations

## Development Notes

### Adding New Functions

To add new AI functions:

1. Define the function in `FUNCTIONS` array in `/api/assistant/route.ts`
2. Implement the function logic in the `callTool` router
3. Add the actual implementation function
4. Update this documentation

### Function Schema Example

```typescript
{
  name: 'function_name',
  description: 'What this function does',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'Parameter description' },
      param2: { type: 'boolean', description: 'Another parameter' }
    },
    required: ['param1']
  }
}
```

### Testing

Test the AI assistant with various scenarios:

1. **Basic CRUD operations** - Creating, reading, updating tasks/projects
2. **Complex queries** - Multi-step analysis and recommendations
3. **Error scenarios** - Invalid inputs, permission issues, API failures
4. **Context preservation** - Multi-turn conversations

## Troubleshooting

### Common Issues

**"OpenAI API key not configured"**
- Solution: Add your API key in Dashboard → Settings

**"Assistant error" or network issues**
- Check internet connection
- Verify API key is valid
- Check OpenAI service status

**Unexpected responses**
- Try rephrasing your question
- Be more specific about what you want
- Check if you have the necessary data (tasks, projects, etc.)

**Permission errors**
- Ensure you're a member of the organization
- Check if the requested data exists and belongs to you

### Performance Optimization

1. **Function Selection**: The AI automatically chooses the most relevant functions
2. **Result Limiting**: Most functions limit results to prevent overwhelming responses
3. **Caching**: Consider implementing response caching for common queries
4. **Model Selection**: Choose the appropriate model based on complexity needs

## Future Enhancements

Potential improvements for the AI assistant:

1. **Memory**: Conversation persistence across sessions
2. **Proactive Suggestions**: Automatic recommendations based on patterns
3. **Integration**: Connect with external tools (calendar, email, etc.)
4. **Advanced Analytics**: Machine learning insights on productivity patterns
5. **Voice Interface**: Speech-to-text and text-to-speech capabilities
6. **Multi-language**: Support for multiple languages
7. **Custom Workflows**: AI-powered automation of routine tasks
