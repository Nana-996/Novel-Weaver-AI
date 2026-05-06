import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For now, we'll create a simplified version of our app
// In a full implementation, we would adapt all components for mobile

export default function NovelWeaverApp() {
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial data from AsyncStorage (React Native equivalent of localStorage)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const savedProjects = await AsyncStorage.getItem('novel-weaver-projects');
        const initialProjects = savedProjects ? JSON.parse(savedProjects) : [];
        
        if (initialProjects.length > 0) {
          setProjects(initialProjects);
          const lastProjectId = await AsyncStorage.getItem('novel-weaver-last-project');
          setActiveProjectId(lastProjectId || initialProjects[0].id);
        } else {
          createNewProject();
        }
      } catch (error) {
        console.error("Failed to load data from AsyncStorage", error);
        await AsyncStorage.clear();
        createNewProject();
      }
    };

    loadInitialData();
  }, []);

  // Auto-save projects
  useEffect(() => {
    const saveProjects = async () => {
      try {
        await AsyncStorage.setItem('novel-weaver-projects', JSON.stringify(projects));
        if (activeProjectId) {
          await AsyncStorage.setItem('novel-weaver-last-project', activeProjectId);
        }
      } catch (error) {
        console.error("Failed to save data to AsyncStorage", error);
      }
    };

    saveProjects();
  }, [projects, activeProjectId]);

  const createNewProject = useCallback(() => {
    const newProject = {
      id: `proj-${Date.now()}`,
      title: 'Untitled Novel',
      createdAt: Date.now(),
      messages: [],
      manuscript: [],
      wordCount: 0,
      characterNotes: '',
      plotNotes: '',
    };
    
    setProjects([newProject]);
    setActiveProjectId(newProject.id);
  }, []);

  const activeProject = projects.find(p => p.id === activeProjectId) ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Novel Weaver AI</Text>
        {activeProject && (
          <Text style={styles.projectInfo}>
            {activeProject.title} ({activeProject.wordCount} words)
          </Text>
        )}
      </View>
      
      <View style={styles.content}>
        {isLoading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : activeProject ? (
          <View style={styles.chatContainer}>
            <Text style={styles.welcomeText}>
              Welcome to Novel Weaver AI! This is a mobile version of the app.
            </Text>
            <Text style={styles.instructionText}>
              In a full implementation, this would contain the chat interface, 
              manuscript view, and all other features of the web app.
            </Text>
          </View>
        ) : (
          <Text style={styles.loadingText}>Loading project...</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    backgroundColor: '#2d2d2d',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  projectInfo: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  chatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
});