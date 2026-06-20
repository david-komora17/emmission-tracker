// src/utils/transitUtils.js

export const getTransitIcon = (mode) => {
    const iconMap = {
        DRIVE: 'Car',
        WALK: 'User',
        TRANSIT: 'Train',
        BUS: 'Bus',
        CYCLE: 'Bike',
        FLIGHT: 'Plane',
        ELECTRIC: 'Zap'
    };

    // Fixed the typo: toUpperCase has a capital 'C'
    return iconMap[mode?.toUpperCase()] || 'Milestone'; 
};

export const formatDistance = (km) => {
    if (!km && km !== 0) return '0.0 km';
    return `${parseFloat(km).toFixed(1)} km`;
};

export const formatCarbon = (kg) => {
    if (!kg && kg !== 0) return '0.0 kg';
    return `${parseFloat(kg).toFixed(1)} kg CO2e`;
};