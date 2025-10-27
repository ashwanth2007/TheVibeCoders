import React from 'react';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';

interface PasswordStrengthMeterProps {
    password?: string;
}

const PasswordRequirement: React.FC<{ isValid: boolean; text: string }> = ({ isValid, text }) => (
    <li className={`flex items-center text-xs transition-colors ${isValid ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-zinc-400'}`}>
        {isValid ? <CheckIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" /> : <XIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />}
        <span>{text}</span>
    </li>
);

export const getPasswordStrength = (password: string): number => {
    const checks = [
        password.length >= 8,
        /[a-z]/.test(password),
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9]/.test(password),
    ];
    // This returns a number from 0 to 5, representing how many criteria are met.
    return checks.filter(Boolean).length;
};

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password = '' }) => {
    const checks = {
        length: password.length >= 8,
        lower: /[a-z]/.test(password),
        upper: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        symbol: /[^A-Za-z0-9]/.test(password),
    };

    const strength = getPasswordStrength(password);
    
    const strengthColors = [
        'bg-gray-300 dark:bg-zinc-600', // 0
        'bg-red-500',                    // 1: Weak
        'bg-red-500',                    // 2: Weak
        'bg-yellow-500',                 // 3: Medium
        'bg-blue-500',                   // 4: Strong
        'bg-green-500',                  // 5: Very Strong
    ];
    
    const strengthLabels: { [key: number]: string } = {
        1: 'Weak',
        2: 'Weak',
        3: 'Medium',
        4: 'Strong',
        5: 'Very Strong',
    };

    return (
        <div className="flex flex-col gap-2 mt-2 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="flex gap-1.5 w-full max-w-[60%]">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div
                            key={index}
                            className={`h-1 flex-1 rounded-full transition-colors ${strength > index ? strengthColors[strength] : strengthColors[0]}`}
                        />
                    ))}
                </div>
                 {strength > 0 && <span className="text-xs font-semibold text-right" style={{ color: strengthColors[strength].replace('bg-', '') }}>{strengthLabels[strength]}</span>}
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                <PasswordRequirement isValid={checks.length} text="At least 8 characters" />
                <PasswordRequirement isValid={checks.lower} text="One lowercase letter" />
                <PasswordRequirement isValid={checks.upper} text="One uppercase letter" />
                <PasswordRequirement isValid={checks.number} text="One number" />
                <PasswordRequirement isValid={checks.symbol} text="One symbol (e.g., !@#$)" />
            </ul>
        </div>
    );
};
