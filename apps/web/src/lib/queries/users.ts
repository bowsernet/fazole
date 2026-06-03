import type { User } from '@fazole/common';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { fetchUsers } from '../firestore/users';
import { queryKeys } from './keys';

export function useUsers(): UseQueryResult<User[]> {
  return useQuery({ queryKey: queryKeys.users.all, queryFn: fetchUsers });
}
