import { create } from 'zustand';
import type { RepairJob, RepairStatus } from '../types';

interface RepairsState {
  jobs: RepairJob[];
  isLoading: boolean;
  error: string | null;
  fetchJobs: () => Promise<void>;
  addJob: (job: RepairJob) => Promise<void>;
  updateJobStatus: (id: string, status: RepairStatus) => Promise<void>;
  updateJob: (id: string, updates: Partial<RepairJob>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
}

const API_URL = 'http://localhost:3000/repairs';

export const useRepairs = create<RepairsState>((set) => ({
  jobs: [],
  isLoading: false,
  error: null,

  fetchJobs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      set({ jobs: data, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addJob: async (job) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job),
      });
      if (!response.ok) throw new Error('Failed to add job');
      const newJob = await response.json();
      set((state) => ({ jobs: [...state.jobs, newJob] }));
    } catch (error) { console.error(error); }
  },

  updateJobStatus: async (id, status) => {
    try {
      const updatedAt = new Date().toISOString();
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, updatedAt }),
      });
      if (!response.ok) throw new Error('Failed to update job status');
      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === id ? { ...j, status, updatedAt } : j
        ),
      }));
    } catch (error) { console.error(error); }
  },

  updateJob: async (id, updates) => {
    try {
      const updatedAt = new Date().toISOString();
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, updatedAt }),
      });
      if (!response.ok) throw new Error('Failed to update job');
      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === id ? { ...j, ...updates, updatedAt } : j
        ),
      }));
    } catch (error) { console.error(error); }
  },

  deleteJob: async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      set((state) => ({
        jobs: state.jobs.filter((j) => j.id !== id),
      }));
    } catch (error) { console.error(error); }
  },
}));
