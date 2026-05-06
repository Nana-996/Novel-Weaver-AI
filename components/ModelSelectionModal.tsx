import React from 'react';
import Modal from './Modal';

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModelSelect: (model: string) => void;
  currentModel: string;
}

const ModelSelectionModal: React.FC<ModelSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  onModelSelect,
  currentModel
}) => {
  // Available models - in a real app, this might come from an API
  const models = [
    { 
      id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', 
      name: 'Dolphin-Mistral 24B (OpenRouter)',
      description: 'Great for creative writing and storytelling'
    },
    { 
      id: 'deepseek/deepseek-chat-v3.1:free', 
      name: 'DeepSeek Chat v3.1 (OpenRouter)',
      description: 'Excellent for detailed and technical writing'
    },
  ];

  const getCurrentModelName = () => {
    const model = models.find(m => m.id === currentModel);
    return model ? model.name : 'Unknown Model';
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Select AI Model"
    >
      <div className="space-y-3">
        <p className="text-text-secondary dark:text-dark-text-secondary">
          Choose an AI model to regenerate the response:
        </p>
        <div className="space-y-2">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => onModelSelect(model.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                currentModel === model.id
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-surface dark:bg-dark-surface border-border-color dark:border-dark-border-color hover:bg-bubble-ai dark:hover:bg-dark-bubble-ai'
              }`}
            >
              <div className="font-medium text-text-primary dark:text-dark-text-primary">
                {model.name}
              </div>
              <div className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
                {model.description}
              </div>
              {currentModel === model.id && (
                <div className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
                  Current default model
                </div>
              )}
            </button>
          ))}
        </div>
        <div className="pt-2 text-sm text-text-secondary dark:text-dark-text-secondary">
          <p>Current default model: <span className="font-medium">{getCurrentModelName()}</span></p>
        </div>
      </div>
    </Modal>
  );
};

export default ModelSelectionModal;