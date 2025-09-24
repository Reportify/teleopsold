import { useState, useEffect, useCallback, useRef } from "react";

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationFilters {
  search?: string;
  status?: string;
  project?: number;
  flow_template?: string;
  priority?: string;
  created_after?: string;
  created_before?: string;
  [key: string]: any;
}

export interface PaginationOptions {
  pageSize?: number;
  cacheKey?: string;
  enableCache?: boolean;
  cacheExpiry?: number; // in milliseconds
}

export interface PaginationResult<T> {
  data: T[];
  pagination: PaginationState;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFilters: (filters: PaginationFilters) => void;
  clearFilters: () => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface CacheEntry<T> {
  data: T[];
  pagination: PaginationState;
  timestamp: number;
  filters: PaginationFilters;
}

export function usePagination<T>(
  fetchFunction: (
    page: number,
    pageSize: number,
    filters: PaginationFilters
  ) => Promise<{
    results: T[];
    count: number;
    next: string | null;
    previous: string | null;
    current_page: number;
    page_size: number;
    total_pages: number;
  }>,
  initialFilters: PaginationFilters = {},
  options: PaginationOptions = {}
): PaginationResult<T> {
  const {
    pageSize: initialPageSize = 20,
    cacheKey = "default",
    enableCache = true,
    cacheExpiry = 5 * 60 * 1000, // 5 minutes
  } = options;

  // State
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<PaginationFilters>(initialFilters);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    pageSize: initialPageSize,
    totalPages: 0,
    totalItems: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Refs
  const cache = useRef<Map<string, CacheEntry<T>>>(new Map());
  const abortController = useRef<AbortController | null>(null);
  const fetchFunctionRef = useRef(fetchFunction);

  // Update fetch function ref when it changes
  useEffect(() => {
    fetchFunctionRef.current = fetchFunction;
  }, [fetchFunction]);

  // Generate cache key
  const generateCacheKey = useCallback(
    (page: number, size: number, filters: PaginationFilters) => {
      const filterString = JSON.stringify(filters);
      return `${cacheKey}_${page}_${size}_${filterString}`;
    },
    [cacheKey]
  );

  // Get from cache
  const getFromCache = useCallback(
    (page: number, size: number, filters: PaginationFilters): CacheEntry<T> | null => {
      if (!enableCache) return null;

      const key = generateCacheKey(page, size, filters);
      const entry = cache.current.get(key);

      if (entry && Date.now() - entry.timestamp < cacheExpiry) {
        return entry;
      }

      // Remove expired entry
      if (entry) {
        cache.current.delete(key);
      }

      return null;
    },
    [enableCache, generateCacheKey, cacheExpiry]
  );

  // Set cache
  const setCache = useCallback(
    (page: number, size: number, filters: PaginationFilters, data: T[], pagination: PaginationState) => {
      if (!enableCache) return;

      const key = generateCacheKey(page, size, filters);
      cache.current.set(key, {
        data,
        pagination,
        timestamp: Date.now(),
        filters,
      });
    },
    [enableCache, generateCacheKey]
  );

  // Clear cache
  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  // Fetch data
  const fetchData = useCallback(
    async (page: number, size: number, currentFilters: PaginationFilters, forceRefresh = false) => {
      // Check cache first
      if (!forceRefresh) {
        const cached = getFromCache(page, size, currentFilters);
        if (cached) {
          setData(cached.data);
          setPagination(cached.pagination);
          setError(null);
          return;
        }
      }

      // Cancel previous request
      if (abortController.current) {
        abortController.current.abort();
      }

      // Create new abort controller
      abortController.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const response = await fetchFunctionRef.current(page, size, currentFilters);

        // Check if request was cancelled
        if (abortController.current?.signal.aborted) {
          return;
        }

        const newPagination: PaginationState = {
          currentPage: response.current_page,
          pageSize: response.page_size,
          totalPages: response.total_pages,
          totalItems: response.count,
          hasNextPage: !!response.next,
          hasPreviousPage: !!response.previous,
        };

        setData(response.results);
        setPagination(newPagination);
        setError(null);

        // Cache the result
        setCache(page, size, currentFilters, response.results, newPagination);
      } catch (err: any) {
        if (err.name === "AbortError") {
          return; // Request was cancelled
        }

        setError(err.message || "Failed to fetch data");
        console.error("Error fetching data:", err);
      } finally {
        if (!abortController.current?.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [getFromCache, setCache]
  );

  // Set page
  const setPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= pagination.totalPages) {
        setCurrentPage(page);
      }
    },
    [pagination.totalPages]
  );

  // Set page size
  const setPageSizeHandler = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  // Set filters
  const setFiltersHandler = useCallback((newFilters: PaginationFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when changing filters
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setCurrentPage(1);
  }, [initialFilters]);

  // Refresh data
  const refresh = useCallback(() => {
    fetchData(currentPage, pageSize, filters, true);
  }, [fetchData, currentPage, pageSize, filters]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData(currentPage, pageSize, filters);
  }, [fetchData, currentPage, pageSize, filters]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return {
    data,
    pagination,
    loading,
    error,
    refresh,
    setPage,
    setPageSize: setPageSizeHandler,
    setFilters: setFiltersHandler,
    clearFilters,
    hasNextPage: pagination.hasNextPage,
    hasPreviousPage: pagination.hasPreviousPage,
  };
}
