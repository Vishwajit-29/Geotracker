
import React from 'react';

export const GeoTrackerLogo: React.FC<{ isLight?: boolean }> = ({ isLight = false }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke={isLight ? "#FFFFFF" : "#007BFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke={isLight ? "#FFFFFF" : "#007BFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 12H19" stroke={isLight ? "#FFFFFF" : "#007BFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 12H3" stroke={isLight ? "#FFFFFF" : "#007BFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 5V3" stroke={isLight ? "#FFFFFF" : "#007BFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 21V19" stroke={isLight ? "#FFFFFF" : "#007BFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
