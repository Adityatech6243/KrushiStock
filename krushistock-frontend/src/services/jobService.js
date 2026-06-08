import api from './api';

export const getJobs = async () => {
  const response = await api.get('/jobs');
  return response.data;
};

export const runJob = async (jobName) => {
  const response = await api.post(`/jobs/${jobName}/run`);
  return response.data;
};

export const getJobLogs = async (filters) => {
  const response = await api.get('/jobs/logs', { params: filters });
  return response.data;
};
