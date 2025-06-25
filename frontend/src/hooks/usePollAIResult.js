// src/hooks/usePollAIResult.js
import { useQuery } from '@tanstack/react-query';
import api from '../api'; // Your configured axios instance

export const usePollAIResult = (taskId, onComplete) => {
    return useQuery({
        queryKey: ['aiQueryStatus', taskId],
        queryFn: async () => {
            const { data } = await api.get(`/ai-advisor/query-status/${taskId}/`);
            return data;
        },
        // Polling configuration
        refetchInterval: (query) => {
            // Stop polling if the query has data and the status is final
            if (query.state.data?.status === 'SUCCESS' || query.state.data?.status === 'FAILURE') {
                return false; // Stop polling
            }
            return 3000; // Poll every 3 seconds
        },
        refetchOnWindowFocus: false,
        enabled: !!taskId, // Only run this query if a taskId is provided
        onSuccess: (data) => {
            if (data.status === 'SUCCESS' || data.status === 'FAILURE') {
                onComplete(data);
            }
        },
        onError: (error) => {
            // Handle critical polling errors (e.g., 404 task not found)
            onComplete({ status: 'FAILURE', error: error.response?.data?.error || 'Polling failed' });
        }
    });
};