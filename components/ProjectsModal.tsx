import React from 'react';
import Modal from './Modal';
import { TrashIcon, PlusIcon } from './Icons';
import type { Project } from '../types';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string | null;
  onSwitchProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onNewProject: () => void;
}

const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen, onClose, projects, activeProjectId, onSwitchProject, onDeleteProject, onNewProject
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Your Stories"
      footer={
        <button
          onClick={onNewProject}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-warm hover:bg-warm-light text-ink font-medium transition-all text-sm btn-warm"
        >
          <PlusIcon className="w-4 h-4" /> Start a New Story
        </button>
      }
    >
      <div className="space-y-2">
        {projects.length > 0 ? (
          projects.map(project => {
            const progressLabel = project.manuscript.length > 0
              ? `${project.manuscript.length} chapters · ${project.wordCount.toLocaleString()} words`
              : project.messages.length > 0
                ? `${project.messages.length} messages`
                : 'Just started';

            return (
              <div
                key={project.id}
                className={`flex items-center justify-between p-3.5 rounded-xl transition-all cursor-pointer group ${project.id === activeProjectId
                    ? 'bg-warm/8 border border-warm/20'
                    : 'bg-ink-200/40 border border-transparent hover:border-ink-400/25 hover:bg-ink-200/70'
                  }`}
                onClick={() => onSwitchProject(project.id)}
              >
                <div className="min-w-0">
                  <p className={`font-medium truncate ${project.id === activeProjectId ? 'text-warm' : 'text-parchment'}`}>{project.title}</p>
                  <p className="text-xs text-parchment-faint mt-0.5">
                    {progressLabel} · {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project.id);
                  }}
                  className="p-2 rounded-lg text-parchment-faint hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            );
          })
        ) : (
          <p className="text-parchment-faint text-center py-8 text-sm">
            You haven't started any stories yet. Let's change that! ✨
          </p>
        )}
      </div>
    </Modal>
  );
};

export default ProjectsModal;