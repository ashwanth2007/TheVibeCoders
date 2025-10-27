import React, { useState, useEffect } from 'react';
import { GenerationStatus } from '../App';
import { CheckIcon } from './icons/CheckIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronUpIcon } from './icons/ChevronUpIcon';

interface GenerationStatusViewProps {
    status: GenerationStatus;
}

const StageIndicator: React.FC<{
    isActive: boolean;
    isDone: boolean;
    text: string;
    timer?: number;
}> = ({ isActive, isDone, text, timer }) => {
    return (
        <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                isActive ? 'bg-blue-600' : (isDone ? 'bg-green-500' : 'bg-gray-200 dark:bg-zinc-700')
            }`}>
                {isActive && <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>}
                {isDone && <CheckIcon className="w-4 h-4 text-white" />}
            </div>
            <span className={`text-sm font-medium transition-colors ${
                isActive ? 'text-gray-800 dark:text-zinc-100' : 'text-gray-500 dark:text-zinc-400'
            }`}>{text}</span>
            {isActive && timer !== undefined && <span className="text-sm text-gray-500 dark:text-zinc-400">({timer}s)</span>}
        </div>
    );
};

export const GenerationStatusView: React.FC<GenerationStatusViewProps> = ({ status }) => {
    const [isPlanExpanded, setIsPlanExpanded] = useState(false);
    
    useEffect(() => {
        // Automatically expand the plan when it's available.
        if (status.plan) {
            setIsPlanExpanded(true);
        }
    }, [status.plan]);

    const stageOrder = ['thinking', 'editing', 'applying', 'reloading'];
    const currentStageIndex = stageOrder.indexOf(status.stage);

    const stages = [
        { key: 'thinking', text: 'Thinking' },
        { key: 'editing', text: 'Editing Files' },
        { key: 'applying', text: 'Applying Changes' },
        { key: 'reloading', text: 'Reloading Preview' },
    ];
    
    return (
        <div className="p-4 lg:p-6 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-200 dark:border-zinc-700 animate-fade-in flex-shrink-0 h-full overflow-y-auto">
             <div className="flex flex-col gap-3">
                 {stages.map((stageInfo, index) => (
                     <StageIndicator 
                        key={stageInfo.key} 
                        isActive={stageInfo.key === status.stage}
                        isDone={index < currentStageIndex}
                        text={stageInfo.text}
                        timer={stageInfo.key === 'thinking' ? status.timer : undefined}
                     />
                 ))}
                 
                 {status.plan && (
                     <div className="ml-9 mt-1 p-3 border-l-2 border-gray-300 dark:border-zinc-600">
                         <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsPlanExpanded(!isPlanExpanded)}>
                             <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400">AI Plan</h4>
                             <button className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700" aria-label={isPlanExpanded ? "Collapse plan" : "Expand plan"}>
                                 {isPlanExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                             </button>
                         </div>
                         <p className={`mt-1 text-sm text-gray-700 dark:text-zinc-300 transition-all duration-300 whitespace-pre-wrap ${isPlanExpanded ? 'max-h-96 overflow-y-auto' : 'max-h-6 overflow-hidden text-ellipsis whitespace-nowrap'}`}>
                            {status.plan}
                         </p>
                     </div>
                 )}

                 {status.stage === 'editing' && status.filesBeingEdited && (
                      <div className="ml-9 mt-1 p-3 border-l-2 border-gray-300 dark:border-zinc-600">
                        <p className="text-sm text-gray-700 dark:text-zinc-300 truncate">
                            ({status.filesBeingEdited.current + 1}/{status.filesBeingEdited.total}) {status.message}
                        </p>
                        <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-1.5 mt-2">
                            <div 
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-200" 
                                style={{ width: `${((status.filesBeingEdited.current + 1) / status.filesBeingEdited.total) * 100}%` }}
                            ></div>
                        </div>
                      </div>
                 )}
             </div>
        </div>
    );
};