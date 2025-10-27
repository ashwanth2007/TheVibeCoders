import React, { useState, useRef, useEffect } from 'react';
import { DesktopIcon } from './icons/DesktopIcon';
import { MobileIcon } from './icons/MobileIcon';
import { TabletIcon } from './icons/TabletIcon';

export type DeviceType = 'current' | 'mobile' | 'tablet';

interface DeviceSelectorProps {
    selectedDevice: DeviceType;
    onSelectDevice: (device: DeviceType) => void;
}

const deviceOptions: { id: DeviceType; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { id: 'current', label: 'Responsive', icon: DesktopIcon },
    { id: 'mobile', label: 'Mobile (375px)', icon: MobileIcon },
    { id: 'tablet', label: 'Tablet (768px)', icon: TabletIcon },
];

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({ selectedDevice, onSelectDevice }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (device: DeviceType) => {
        onSelectDevice(device);
        setIsOpen(false);
    };

    const selectedOption = deviceOptions.find(option => option.id === selectedDevice) || deviceOptions[0];
    const SelectedIcon = selectedOption.icon;

    return (
        <div ref={wrapperRef} className="relative">
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 rounded-md hover:bg-gray-300 dark:hover:bg-zinc-700"
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label="Select device for preview"
                title={`Preview device: ${selectedOption.label}`}
            >
                <SelectedIcon aria-hidden="true" className="w-4 h-4" />
            </button>
            {isOpen && (
                <div 
                    className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-md shadow-lg ring-1 ring-black dark:ring-white ring-opacity-5 dark:ring-opacity-10 focus:outline-none z-10 animate-fade-in"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="menu-button"
                >
                    <div className="py-1" role="none">
                        {deviceOptions.map(option => (
                            <button
                                key={option.id}
                                onClick={() => handleSelect(option.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${selectedDevice === option.id ? 'bg-gray-100 dark:bg-zinc-700' : 'hover:bg-gray-100 dark:hover:bg-zinc-600'}`}
                                role="menuitem"
                            >
                                <option.icon className="w-5 h-5" aria-hidden="true" />
                                <span>{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};