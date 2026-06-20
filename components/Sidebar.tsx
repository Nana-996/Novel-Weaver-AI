import React from 'react';
import {
  MenuIcon,
  PlusIcon,
  FolderIcon,
  DownloadIcon,
  SettingsIcon,
} from './Icons';

interface SidebarProps {
  onNewNovel: () => void;
  onExport: () => void;
  onProjects: () => void;
  onSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNewNovel, onExport, onProjects, onSettings }) => {
  return (
    <div className="w-[60px] bg-surface dark:bg-dark-surface/50 flex flex-col items-center justify-between py-6 border-r border-border-color dark:border-dark-border-color z-20">
      <div className="flex flex-col items-center space-y-8">
        <button className="text-primary hover:text-primary-hover transition-colors transform hover:scale-105" title="Menu">
          <MenuIcon className="w-6 h-6" />
        </button>
        <button
          onClick={onNewNovel}
          className="bg-primary hover:bg-white text-white hover:text-primary rounded-xl p-3 shadow-lg shadow-primary/20 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1"
          title="New Novel"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
        <div className="w-8 h-[1px] bg-border-color dark:bg-dark-border-color opacity-50"></div>
        <button onClick={onProjects} className="text-text-secondary hover:text-primary dark:hover:text-primary transition-colors hover:scale-110" title="Projects">
          <FolderIcon className="w-6 h-6" />
        </button>
        <button onClick={onExport} className="text-text-secondary hover:text-primary dark:hover:text-primary transition-colors hover:scale-110" title="Export Novel">
          <DownloadIcon className="w-6 h-6" />
        </button>
      </div>
      <div className="flex flex-col items-center pb-2">
        <button onClick={onSettings} className="text-text-secondary hover:text-primary dark:hover:text-primary transition-colors hover:rotate-90 duration-500" title="Settings">
          <SettingsIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;