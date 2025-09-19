import useSWR, { SWRConfiguration, mutate } from 'swr';
import { useCallback, useMemo } from 'react';

// Optimized fetcher with error handling
const fetcher = async (url: string): Promise<unknown> => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
};

// Default SWR configuration for better performance
export const defaultSWRConfig: SWRConfiguration = {
    fetcher,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 0, // Disable polling by default
    dedupingInterval: 2000, // Dedupe requests within 2 seconds
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    loadingTimeout: 10000,
    onError: (error) => {
        console.error('SWR Error:', error);
    },
};

// Custom hook for optimized data fetching
export function useOptimizedSWR<T>(
    key: string | null,
    config?: SWRConfiguration
) {
    const mergedConfig = useMemo(() => ({
        ...defaultSWRConfig,
        ...config,
    }), [config]);

    const result = useSWR<T>(key, mergedConfig);

    // Memoized refresh function
    const refresh = useCallback(() => {
        if (key) {
            mutate(key);
        }
    }, [key]);

    // Memoized invalidate function  
    const invalidate = useCallback(() => {
        if (key) {
            mutate(key, undefined, { revalidate: false });
        }
    }, [key]);

    return {
        ...result,
        refresh,
        invalidate,
        isLoading: !result.error && !result.data,
        isEmpty: !result.error && !result.data,
    };
}

// Specific hooks for common data types
export function useCategories() {
    return useOptimizedSWR('/api/categories', {
        refreshInterval: 300000, // 5 minutes
    });
}

export function useGallery(category?: string) {
    const key = category ? `/api/gallery?category=${category}` : '/api/gallery';
    return useOptimizedSWR(key, {
        refreshInterval: 600000, // 10 minutes
    });
}

export function usePrices() {
    return useOptimizedSWR('/api/prices', {
        refreshInterval: 900000, // 15 minutes
    });
}

export function useRoomFeatures() {
    return useOptimizedSWR('/api/room-features', {
        refreshInterval: 1800000, // 30 minutes (static data)
    });
}

// Prefetch utility for critical data
export function prefetchData(keys: string[]) {
    keys.forEach(key => {
        mutate(key, fetcher(key), { revalidate: false });
    });
}

export default useOptimizedSWR;