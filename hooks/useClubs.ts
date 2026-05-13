import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getClubsByChildId,
  getClubById,
  insertClub,
  updateClub,
  deleteClub,
  markClubAsPaid,
  getAllClubsWithSchedules,
  ClubWithSchedules,
  CreateClubInput,
  UpdateClubInput,
} from '@/lib/repositories';

/**
 * Fetch all clubs for a specific child
 */
export function useClubsByChild(childId: number) {
  return useQuery({
    queryKey: ['clubs', childId],
    queryFn: () => getClubsByChildId(childId),
    enabled: childId > 0,
  });
}

/**
 * Fetch a single club with its schedules
 */
export function useClub(id: number) {
  return useQuery({
    queryKey: ['club', id],
    queryFn: () => getClubById(id),
    enabled: id > 0,
  });
}

/**
 * Fetch all clubs across all children with schedules
 */
export function useAllClubs() {
  return useQuery({
    queryKey: ['clubs'],
    queryFn: getAllClubsWithSchedules,
  });
}

/**
 * Create a new club for a child
 */
export function useCreateClub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: insertClub,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clubs', variables.child_id] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
  });
}

/**
 * Update an existing club
 */
export function useUpdateClub(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateClubInput) => updateClub(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club', id] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
  });
}

/**
 * Delete a club
 */
export function useDeleteClub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteClub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
  });
}

/**
 * Mark a club's payment as completed
 * Updates the next_payment_date field to the next month.
 */
export function useMarkAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clubId }: { clubId: number }) => {
      await markClubAsPaid(clubId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['club', variables.clubId] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
  });
}
