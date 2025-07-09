# AI Assistant Testing Guide

This guide helps you test the AI productivity assistant functionality.

## Prerequisites

1. **OpenAI API Key**: You need a valid OpenAI API key
2. **Database Setup**: Ensure Prisma is set up and database is running
3. **User Account**: Clerk authentication should be working

## Step 1: Configure Your API Key

1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Navigate to `/dashboard/settings` in the app
4. Enter your API key in the "OpenAI API Key" field
5. Select "GPT-4o Mini" as your model (recommended for testing)
6. Save settings

## Step 2: Test Basic Functionality

### Access the AI Assistant

1. Go to `/dashboard/ai`
2. You should see the AI chat interface with suggested prompts

### Test Queries

Try these example queries to test different functions:

#### Task Queries
```
"Show me all my tasks"
"What are my high-priority tasks?"
"List my overdue tasks"
"Show tasks that are due today"
```

#### Project Queries
```
"Show me all my projects"
"What projects am I working on?"
"List projects for my organization"
```

#### Team Queries
```
"Show me my teams"
"What organizations am I part of?"
"List my team members"
```

#### Creation Commands
```
"Create a task called 'Review quarterly report' due tomorrow"
"Create a high-priority task for client meeting on Friday"
"Add a project called 'Website Redesign' with description 'Redesign the company website'"
```

#### Analytics Queries
```
"Analyze my project performance"
"Show me task completion rates"
"How is my team performing?"
"Give me insights on my productivity"
```

## Step 3: Test Advanced Features

### Task Improvement Suggestions

1. First, create a task with some basic information
2. Note the task ID from the response
3. Ask: "Suggest improvements for task [ID]"
4. The AI should analyze the task and provide specific suggestions

### Project Analytics

1. Ensure you have a project with multiple tasks
2. Ask: "Analyze project [PROJECT_NAME]" or provide project ID
3. You should get detailed analytics including:
   - Completion rates
   - Team performance
   - Overdue tasks
   - Recommendations

### Context-Aware Responses

The AI assistant maintains context within a conversation:

1. Ask: "Show me my projects"
2. Follow up with: "Analyze the first one"
3. Then: "Create a task for that project"

The AI should understand the context and reference previous responses.

## Step 4: Test Error Scenarios

### Invalid API Key
1. Set an invalid API key in settings
2. Try asking a question
3. Should get a clear error message about invalid API key

### No API Key
1. Remove your API key from settings
2. Try asking a question
3. Should get an error about API key not being configured

### Permission Errors
1. Try accessing data that doesn't exist
2. Should get appropriate error messages

### Rate Limiting
1. Make multiple rapid requests
2. Should handle rate limits gracefully

## Step 5: Test UI Components

### Settings Page
1. Go to `/dashboard/settings`
2. Test all form fields:
   - AI model selection
   - API key input (should be masked when displayed)
   - AI instructions textarea
   - Do Not Disturb hours
   - Beta features toggle
3. Save and reload - settings should persist

### AI Chat Interface
1. Test conversation flow
2. Try suggested prompts
3. Test Enter key for sending
4. Test Shift+Enter for new lines
5. Verify loading states
6. Check error message display

### Task Creation (Optional)
If you've integrated the AITaskCreator component:
1. Try the AI-powered task creation
2. Test the "generate suggestions" feature
3. Verify task creation works

## Step 6: Performance Testing

### Response Times
Monitor response times for different types of queries:
- Simple data retrieval: Should be < 2 seconds
- Complex analytics: May take 3-5 seconds
- Task creation: Should be < 3 seconds

### Model Comparison
Test different AI models to see performance differences:
1. GPT-4o Mini: Fast, good for basic queries
2. GPT-4o: Slower but better for complex analysis
3. GPT-3.5 Turbo: Fastest but may miss nuances

## Expected Behavior

### Successful Responses
- Clear, actionable responses
- Proper formatting
- Relevant data included
- Context awareness in conversations

### Function Calls
The AI should automatically:
- Choose appropriate functions based on user intent
- Extract relevant parameters from natural language
- Provide helpful error messages for missing data
- Suggest next steps or related actions

### Data Security
- Users should only see their own data
- Organization data should be properly filtered
- No sensitive information should be exposed

## Troubleshooting

### Common Issues

**"Assistant error"**
- Check your internet connection
- Verify OpenAI API key is valid
- Check browser console for detailed errors

**Empty responses**
- Try rephrasing your question
- Be more specific about what you want
- Ensure you have data (tasks/projects) to query

**Permission errors**
- Make sure you're logged in
- Check if you have the necessary data
- Verify organization membership

**Slow responses**
- Try using GPT-4o Mini for faster responses
- Check OpenAI service status
- Consider simplifying complex queries

### Debug Mode

To enable debug logging:
1. Open browser developer tools
2. Check the Console tab
3. Network tab shows API calls and responses
4. Look for errors in the API responses

## Success Criteria

The AI assistant is working correctly if:

✅ Settings page loads and saves API key  
✅ AI chat interface responds to queries  
✅ Task queries return relevant data  
✅ Project analytics work correctly  
✅ Task/project creation functions work  
✅ Error handling provides clear messages  
✅ Conversation context is maintained  
✅ Response times are reasonable  
✅ Data security is maintained  

## Next Steps

After testing:
1. Try integrating AI suggestions into existing workflows
2. Experiment with custom AI instructions
3. Test with real project data
4. Gather user feedback for improvements
5. Monitor usage patterns and performance

## Sample Test Data

For comprehensive testing, create:
- 2-3 projects with different completion rates
- 10-15 tasks with various priorities and due dates
- Some overdue tasks
- Tasks with and without AI instructions
- Multiple team members (if testing team features)

This will give the AI assistant meaningful data to analyze and provide insights on.
