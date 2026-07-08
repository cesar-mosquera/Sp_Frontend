import { useState, useCallback, useRef } from 'react';

interface UsePaginationOptions {
  initialLimit?: number;
  maxLimit?: number;
}

interface UsePaginationReturn {
  skip: number;
  limit: number;
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
  totalCount: number | null;
  setTotalCount: (count: number) => void;
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const { initialLimit = 50 } = options;
  
  const [skip, setSkip] = useState(0);
  const limit = initialLimit;
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const isLoadingMoreRef = useRef(false);

  const hasMore = totalCount !== null ? skip + limit < totalCount : true;

  const loadMore = useCallback(() => {
    if (isLoadingMoreRef.current || !hasMore) return;
    isLoadingMoreRef.current = true;
    setSkip(s => s + limit);
    setTimeout(() => {
      isLoadingMoreRef.current = false;
    }, 300);
  }, [limit, hasMore]);

  const reset = useCallback(() => {
    setSkip(0);
    setTotalCount(null);
    isLoadingMoreRef.current = false;
  }, []);

  return {
    skip,
    limit,
    hasMore,
    loadMore,
    reset,
    totalCount,
    setTotalCount,
  };
}
