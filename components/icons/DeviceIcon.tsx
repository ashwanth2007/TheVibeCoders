import React from 'react';

export const DeviceIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="14" height="10" x="4" y="8" rx="2" />
        <path d="M4 18h14" />
        <path d="M18 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2v-4h-1" />
    </svg>
);