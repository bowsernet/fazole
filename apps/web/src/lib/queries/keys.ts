export const queryKeys = {
  beans: {
    all: ['beans'] as const,
    detail: (id: string) => ['beans', id] as const,
    images: (id: string) => ['beanImages', id] as const,
  },
  sources: {
    all: ['sources'] as const,
    detail: (id: string) => ['sources', id] as const,
  },
  growRecords: {
    all: ['growRecords'] as const,
    query: (options: unknown) => ['growRecords', options] as const,
    detail: (id: string) => ['growRecords', 'detail', id] as const,
  },
  users: { all: ['users'] as const },
  seasons: { all: ['seasons'] as const },
  home: { all: ['home'] as const, byYear: (year: number) => ['home', year] as const },
} as const;
