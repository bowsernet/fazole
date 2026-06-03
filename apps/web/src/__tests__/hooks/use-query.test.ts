import { describe, expect, it, vi } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';

import { useQuery } from '../../hooks/use-query';

describe('useQuery', () => {
  it('should return data after successful fetch', async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: '1', name: 'Test' });
    const { result } = renderHook(() => useQuery(fetcher));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual({ id: '1', name: 'Test' });
      expect(result.current.error).toBeNull();
    });
  });

  it('should return error on failure', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useQuery(fetcher));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should refetch when refetch is called', async () => {
    const fetcher = vi.fn().mockResolvedValue('v1');
    const { result } = renderHook(() => useQuery(fetcher));

    await waitFor(() => expect(result.current.data).toBe('v1'));

    fetcher.mockResolvedValue('v2');
    result.current.refetch();

    await waitFor(() => expect(result.current.data).toBe('v2'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('should re-run when the fetcher identity changes', async () => {
    const first = vi.fn().mockResolvedValue('empty');
    const second = vi.fn().mockResolvedValue('loaded');

    const { result, rerender } = renderHook(({ fetcher }) => useQuery(fetcher), {
      initialProps: { fetcher: first },
    });

    await waitFor(() => expect(result.current.data).toBe('empty'));

    rerender({ fetcher: second });

    await waitFor(() => expect(result.current.data).toBe('loaded'));
    expect(second).toHaveBeenCalledTimes(1);
  });
});
