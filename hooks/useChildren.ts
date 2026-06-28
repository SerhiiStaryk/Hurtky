import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getChildren,
  getChildById,
  insertChild,
  updateChild,
  deleteChild,
  Child,
  ChildWithClubs,
  CreateChildInput,
  UpdateChildInput,
} from '@/lib/repositories';
import { rescheduleAllNotifications } from '@/lib/notifications';

/**
 * Fetch all children
 */
export function useChildren() {
  return useQuery({
    queryKey: ['children'],
    queryFn: getChildren,
  });
}

/**
 * Fetch a single child with their clubs
 */
export function useChild(id: number) {
  return useQuery({
    queryKey: ['child', id],
    queryFn: () => getChildById(id),
    enabled: id > 0,
  });
}

/**
 * Create a new child
 */
export function useCreateChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: insertChild,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
    },
  });
}

/**
 * Update an existing child
 */
export function useUpdateChild(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateChildInput) => updateChild(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      queryClient.invalidateQueries({ queryKey: ['child', id] });
    },
  });
}

/**
 * Delete a child
 */
export function useDeleteChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteChild,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      await rescheduleAllNotifications();
    },
  });
}
