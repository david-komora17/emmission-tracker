// src/services/complaintService.js

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Helper function to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

// Create a new complaint (User)
export const createComplaint = async (subject, message) => {
    try {
        const response = await fetch(`${baseUrl}/api/feedback/complaints/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ subject, message })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to submit complaint');
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Create complaint error:', error);
        return { success: false, error: error.message };
    }
};

// Get all complaints (Admin only)
export const fetchComplaints = async () => {
    try {
        const response = await fetch(`${baseUrl}/api/feedback/complaints/`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to fetch complaints');
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Fetch complaints error:', error);
        return { success: false, error: error.message };
    }
};

// Send response to complaint (Admin only)
export const sendResponse = async (complaintId, responseText) => {
    try {
        const response = await fetch(`${baseUrl}/api/feedback/complaints/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ 
                complaint_id: complaintId,
                response: responseText 
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to send response');
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Send response error:', error);
        return { success: false, error: error.message };
    }
};

// Update complaint status (Admin only)
export const updateComplaintStatus = async (complaintId, status) => {
    try {
        const response = await fetch(`${baseUrl}/api/feedback/complaints/${complaintId}/`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to update status');
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Update status error:', error);
        return { success: false, error: error.message };
    }
};

// Delete complaint (Admin only - only addressed complaints)
export const deleteComplaint = async (complaintId) => {
    try {
        const response = await fetch(`${baseUrl}/api/feedback/complaints/${complaintId}/`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to delete complaint');
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Delete complaint error:', error);
        return { success: false, error: error.message };
    }
};

// Bulk delete addressed complaints (Admin only)
export const deleteAllAddressed = async (complaints) => {
    try {
        const addressedComplaints = complaints.filter(c => c.status === 'addressed');
        
        if (addressedComplaints.length === 0) {
            return { success: false, error: 'No addressed complaints to delete' };
        }
        
        const deletePromises = addressedComplaints.map(c => 
            fetch(`${baseUrl}/api/feedback/complaints/${c.id}/`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            })
        );
        
        const results = await Promise.all(deletePromises);
        const allSuccess = results.every(r => r.ok);
        
        if (!allSuccess) {
            throw new Error('Some complaints failed to delete');
        }
        
        return { 
            success: true, 
            data: { deletedCount: addressedComplaints.length } 
        };
    } catch (error) {
        console.error('Bulk delete error:', error);
        return { success: false, error: error.message };
    }
};