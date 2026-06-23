import { supabase } from './supabaseClient';
import type { Project, StoryNotes } from '../types';

// ============================================================
// Offline-First Project Service
// Uses localStorage as primary store, syncs to Supabase when online
// ============================================================

const LOCAL_STORAGE_KEY = 'novel-weaver-projects';
const LAST_SYNC_KEY = 'novel-weaver-last-sync';
const SYNC_DEBOUNCE_MS = 2000;

let syncTimeout: number | null = null;

// --- localStorage operations (always available, even offline) ---

export function loadProjectsFromLocal(): Project[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      let projects: Project[] = JSON.parse(saved);
      // Migrate old format if needed
      projects = projects.map(p => {
        if (!p.notes) {
          return {
            ...p,
            notes: {
              idea: '',
              plot: (p as any).plotNotes || '',
              characters: (p as any).characterNotes || '',
              outline: '',
            },
          };
        }
        return p;
      });
      return projects;
    }
  } catch (error) {
    console.error('[ProjectService] Failed to load from localStorage:', error);
  }
  return [];
}

export function saveProjectsToLocal(projects: Project[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('[ProjectService] Failed to save to localStorage:', error);
  }
}

// --- Supabase cloud operations ---

function projectToDbRow(project: Project, userId: string) {
  return {
    id: project.id,
    user_id: userId,
    title: project.title,
    messages: project.messages,
    manuscript: project.manuscript,
    notes: project.notes,
    word_count: project.wordCount,
    updated_at: project.updatedAt ? new Date(project.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function dbRowToProject(row: any): Project {
  return {
    id: row.id,
    title: row.title,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    messages: row.messages || [],
    manuscript: row.manuscript || [],
    wordCount: row.word_count || 0,
    notes: row.notes || { idea: '', plot: '', characters: '', outline: '' },
  };
}

export async function loadProjectsFromCloud(userId: string): Promise<Project[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[ProjectService] Cloud load error:', error);
      return [];
    }

    return (data || []).map(dbRowToProject);
  } catch (error) {
    console.error('[ProjectService] Cloud load failed:', error);
    return [];
  }
}

export async function saveProjectToCloud(project: Project, userId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('projects')
      .upsert(projectToDbRow(project, userId), { onConflict: 'id' });

    if (error) {
      console.error('[ProjectService] Cloud save error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[ProjectService] Cloud save failed:', error);
    return false;
  }
}

export async function deleteProjectFromCloud(projectId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('[ProjectService] Cloud delete error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[ProjectService] Cloud delete failed:', error);
    return false;
  }
}

// --- Sync logic: merge local and cloud data ---

export async function syncProjects(userId: string, localProjects: Project[]): Promise<Project[]> {
  if (!supabase) return localProjects;

  try {
    const cloudProjects = await loadProjectsFromCloud(userId);

    // Build a map of all projects by ID
    const merged = new Map<string, Project>();

    // Start with cloud projects
    for (const p of cloudProjects) {
      merged.set(p.id, p);
    }

    // Merge local projects
    for (const p of localProjects) {
      const existing = merged.get(p.id);
      
      if (!existing) {
        // Is this a completely untouched default dummy project?
        const isUntouchedDummy = p.messages.length === 0 && 
                                 p.wordCount === 0 && 
                                 p.manuscript.length === 0 &&
                                 !p.notes.idea && !p.notes.plot && !p.notes.characters && !p.notes.outline &&
                                 p.title === 'My New Story';
        
        // If it's a dummy and the user already has real projects in the cloud, silently discard it
        if (isUntouchedDummy && cloudProjects.length > 0) {
          continue;
        }

        // New local project — upload to cloud
        merged.set(p.id, p);
        saveProjectToCloud(p, userId).catch(console.error);
      } else {
        // Conflict resolution: strictly use the latest updatedAt timestamp
        const localTime = p.updatedAt || 0;
        const cloudTime = existing.updatedAt || 0;

        if (localTime > cloudTime) {
          merged.set(p.id, p);
          saveProjectToCloud(p, userId).catch(console.error);
        }
      }
    }

    // Sort by most recently updated
    const syncedProjects = Array.from(merged.values()).sort((a, b) => 
      (b.updatedAt || 0) - (a.updatedAt || 0)
    );

    // Update local storage with merged data
    saveProjectsToLocal(syncedProjects);
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

    console.log(`[ProjectService] Synced ${syncedProjects.length} projects (${localProjects.length} local, ${cloudProjects.length} cloud)`);
    return syncedProjects;
  } catch (error) {
    console.error('[ProjectService] Sync failed, using local data:', error);
    return localProjects;
  }
}

// Debounced cloud save — call this on every project change
export function debouncedCloudSave(project: Project, userId: string): void {
  if (!supabase || !userId) return;

  if (syncTimeout) {
    window.clearTimeout(syncTimeout);
  }

  syncTimeout = window.setTimeout(() => {
    saveProjectToCloud(project, userId).catch(console.error);
    syncTimeout = null;
  }, SYNC_DEBOUNCE_MS);
}

// Save all projects to cloud (batch)
export async function saveAllProjectsToCloud(projects: Project[], userId: string): Promise<void> {
  if (!supabase || !userId) return;

  for (const project of projects) {
    await saveProjectToCloud(project, userId);
  }
}
