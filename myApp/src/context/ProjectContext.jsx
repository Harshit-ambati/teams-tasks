import { createContext, useState, useEffect } from 'react';

export const ProjectContext = createContext();

export function ProjectProvider({ children }) {
    const [projects, setProjects] = useState(() => {
        try {
            const saved = localStorage.getItem('projects');
            return saved ? JSON.parse(saved) : [
                { id: '1', title: 'Website Redesign', description: 'Revamp the company website with modern UI.', status: 'active', progress: 75 },
                { id: '2', title: 'Mobile App', description: 'Develop a cross-platform mobile application.', status: 'planning', progress: 15 },
                { id: '3', title: 'Marketing Campaign', description: 'Q4 marketing strategy and execution.', status: 'completed', progress: 100 }
            ];
        } catch (e) {
            return [];
        }
    });

    const [activities, setActivities] = useState([
        { id: 1, user: 'Alex', action: 'completed a task', target: 'Homepage Hero', time: '2h ago' },
        { id: 2, user: 'Sam', action: 'added a comment', target: 'Mobile Nav', time: '4h ago' },
        { id: 3, user: 'You', action: 'created a project', target: 'Marketing Campaign', time: '1d ago' },
        { id: 4, user: 'Alex', action: 'updated status', target: 'API Integration', time: '1d ago' }
    ]);

    useEffect(() => {
        localStorage.setItem('projects', JSON.stringify(projects));
    }, [projects]);

    const addProject = (project) => {
        setProjects(prev => [...prev, { ...project, id: Date.now().toString(), progress: 0 }]);
        addActivity({ user: 'You', action: 'created project', target: project.title });
    };

    const deleteProject = (id) => {
        setProjects(prev => prev.filter(p => p.id !== id));
    };

    const addActivity = (activity) => {
        setActivities(prev => [{ id: Date.now(), time: 'Just now', ...activity }, ...prev]);
    };

    return (
        <ProjectContext.Provider value={{ projects, activities, addProject, deleteProject }}>
            {children}
        </ProjectContext.Provider>
    );
}
