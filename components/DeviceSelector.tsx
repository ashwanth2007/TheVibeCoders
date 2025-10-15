import React, { useState, useRef, useEffect } from 'react';
import { DeviceIcon } from './icons/DeviceIcon';
import { DesktopIcon } from './icons/DesktopIcon';
import { MobileIcon } from './icons/MobileIcon';
import { TabletIcon } from './icons/TabletIcon';

export type DeviceType = 'current' | 'mobile' | 'tablet';

interface DeviceSelectorProps {
    selectedDevice: DeviceType;
    onSelectDevice: (device: DeviceType) => void;
}

const deviceOptions: { id: DeviceType; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { id: 'current', label: 'Current screen size', icon: DesktopIcon },
    { id: 'mobile', label: 'Mobile', icon: MobileIcon },
    { id: 'tablet', label: 'Tablet', icon: TabletIcon },
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

    return (
        <div ref={wrapperRef} className="relative">
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900"
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label="Select device for preview"
            >
                <DeviceIcon aria-hidden="true" className="w-4 h-4" />
                Device
            </button>
            {isOpen && (
                <div 
                    className="absolute right-0 mt-2 w-56 origin-top-right bg-gray-800 text-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10 animate-fade-in"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="menu-button"
                >
                    <div className="py-1" role="none">
                        {deviceOptions.map(option => (
                            <button
                                key={option.id}
                                onClick={() => handleSelect(option.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${selectedDevice === option.id ? 'bg-gray-700' : 'hover:bg-gray-600'}`}
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