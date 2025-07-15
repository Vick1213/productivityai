'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  FileText, 
  Download,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface Goal {
  id: string;
  name: string;
  description: string | null;
  currentProgress: number;
  totalTarget: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Task {
  id: string;
  name: string;
  completed: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueAt: Date;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  completed: boolean;
  dueAt: Date | null;
  smartleadCampaignId?: string | null;
  tasks: Task[];
  goals: Goal[];
  organization: {
    id: string;
    name: string;
  } | null;
}

export default function CampaignReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects');
        const data = await response.json();
        setProjects(data.projects || []);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  // Separate projects into campaigns and regular projects
  const smartleadProjects = projects.filter(p => p.smartleadCampaignId);
  const normalProjects = projects.filter(p => !p.smartleadCampaignId);

  // Handle project selection
  const toggleProjectSelection = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  // Handle campaign selection
  const toggleCampaignSelection = (campaignId: string) => {
    const newSelected = new Set(selectedCampaigns);
    if (newSelected.has(campaignId)) {
      newSelected.delete(campaignId);
    } else {
      newSelected.add(campaignId);
    }
    setSelectedCampaigns(newSelected);
  };

  // Select all projects
  const selectAllProjects = () => {
    setSelectedProjects(new Set(normalProjects.map(p => p.id)));
  };

  // Select all campaigns
  const selectAllCampaigns = () => {
    setSelectedCampaigns(new Set(smartleadProjects.map(p => p.id)));
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedProjects(new Set());
    setSelectedCampaigns(new Set());
  };

  // Generate report
  const generateReport = async () => {
    setIsGenerating(true);
    
    const selectedData = {
      campaigns: Array.from(selectedCampaigns),
      projects: Array.from(selectedProjects),
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/generatereport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedData),
      });

      if (response.ok) {
        // Handle successful response
        console.log('Report generated successfully');
        // You can add additional logic here like showing a success message
      } else {
        console.error('Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaign Reports</h2>
          <p className="text-muted-foreground">Select campaigns and projects to generate reports</p>
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  const totalSelected = selectedProjects.size + selectedCampaigns.size;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaign Reports</h2>
          <p className="text-muted-foreground">Select campaigns and projects to generate comprehensive reports</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {totalSelected} selected
          </Badge>
          <Button
            onClick={generateReport}
            disabled={totalSelected === 0 || isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Selection Controls
          </CardTitle>
          <CardDescription>
            Quickly select or deselect multiple items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              onClick={selectAllCampaigns}
              disabled={smartleadProjects.length === 0}
            >
              Select All Campaigns ({smartleadProjects.length})
            </Button>
            <Button 
              variant="outline" 
              onClick={selectAllProjects}
              disabled={normalProjects.length === 0}
            >
              Select All Projects ({normalProjects.length})
            </Button>
            <Button 
              variant="outline" 
              onClick={clearAllSelections}
              disabled={totalSelected === 0}
            >
              Clear All Selections
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SmartLeads Campaigns Section */}
      {smartleadProjects.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="h-5 w-5" /> SmartLeads Campaigns
          </h3>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {smartleadProjects.map(project => (
              <Card key={project.id} className={`hover:shadow-lg transition-all duration-200 border-l-4 ${
                selectedCampaigns.has(project.id) ? 'border-l-[#26D16D] bg-[#26D16D]/5' : 'border-l-gray-200'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedCampaigns.has(project.id)}
                      onCheckedChange={() => toggleCampaignSelection(project.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#26D16D] rounded-full animate-pulse"></div>
                        {project.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-2 flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs px-2 py-0">
                          ID: {project.smartleadCampaignId}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {project.goals.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-[#26D16D]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <AlertCircle className="h-8 w-8 text-[#26D16D]" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        No campaign metrics available
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {project.goals.map(g => (
                        <div key={g.id} className="bg-gradient-to-r from-[#26D16D]/10 to-[#26D16D]/5 p-4 rounded-lg border border-[#26D16D]/20">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-[#26D16D] rounded-full"></div>
                              <span className="font-semibold text-gray-900">{g.name}</span>
                            </div>
                            <div className="bg-white px-3 py-1 rounded-full border shadow-sm">
                              <span className="text-lg font-bold text-[#26D16D]">{g.currentProgress.toLocaleString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              {g.description || 'Campaign activity'}
                            </span>
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md">
                              Updated {format(new Date(g.updatedAt), 'MMM d')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-4 border-t bg-gray-50/50">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-xs text-muted-foreground">
                      {project.goals.length} metric{project.goals.length !== 1 ? 's' : ''} tracked
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {format(new Date(project.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Regular Projects Section */}
      {normalProjects.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" /> Projects
          </h3>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {normalProjects.map(project => (
              <Card key={project.id} className={`hover:shadow-lg transition-all duration-200 border-l-4 ${
                selectedProjects.has(project.id) ? 'border-l-blue-500 bg-blue-50/50' : 'border-l-gray-200'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedProjects.has(project.id)}
                      onCheckedChange={() => toggleProjectSelection(project.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {project.completed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        )}
                        {project.name}
                      </CardTitle>
                      {project.description && (
                        <CardDescription className="text-sm mt-2">
                          {project.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    {/* Tasks Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-25 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">Tasks</span>
                        <Badge variant="outline" className="text-xs">
                          {project.tasks.filter(t => t.completed).length}/{project.tasks.length} completed
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        {project.tasks.length === 0 ? (
                          'No tasks created'
                        ) : (
                          `${project.tasks.filter(t => !t.completed).length} remaining tasks`
                        )}
                      </div>
                    </div>

                    {/* Goals Summary */}
                    {project.goals.length > 0 && (
                      <div className="bg-gradient-to-r from-green-50 to-green-25 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900">Goals</span>
                          <Badge variant="outline" className="text-xs">
                            {project.goals.length} active
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          {project.goals.length} goal{project.goals.length !== 1 ? 's' : ''} tracked
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-4 border-t bg-gray-50/50">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-xs text-muted-foreground">
                      {project.organization?.name || 'Personal Project'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {format(new Date(project.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {projects.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
            <p className="text-muted-foreground">
              Create some projects or campaigns to start generating reports.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
