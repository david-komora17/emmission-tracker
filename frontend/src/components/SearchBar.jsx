// src/components/SearchBar.jsx
import React, { useState } from 'react';
import { MapPin, Navigation, Search } from 'lucide-react';

function SearchBar({ onOptimize, loading }) {
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (origin.trim() && destination.trim()) {
            onOptimize({origin, destination})
        }
    };

    return(
        
    )

}