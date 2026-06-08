import React, { useState, useEffect } from 'react';
import { getJobs, runJob, getJobLogs } from '../../services/jobService';
import Table from '../../components/common/Table';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import { 
  Play, 
  History, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Activity,
  RefreshCw
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/alert';

const BackgroundJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [triggeringJob, setTriggeringJob] = useState({});
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchJobsList = async () => {
    setLoadingJobs(true);
    try {
      const res = await getJobs();
      if (res?.success) {
        setJobs(res.data);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchLogsList = async (page = 1) => {
    setLoadingLogs(true);
    try {
      const res = await getJobLogs({ page, limit: 10 });
      if (res?.success) {
        setLogs(res.data);
        setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchJobsList();
    fetchLogsList();
  }, []);

  const handleRunJob = async (jobName) => {
    setTriggeringJob(prev => ({ ...prev, [jobName]: true }));
    try {
      const res = await runJob(jobName);
      if (res?.success) {
        showSuccess('Job Started', res.message);
        // Refresh after a short delay so background run can show up in logs
        setTimeout(() => {
          fetchJobsList();
          fetchLogsList(1);
        }, 1500);
      }
    } catch (err) {
      showError('Execution Failed', err.response?.data?.message || 'Could not start background job.');
    } finally {
      setTriggeringJob(prev => ({ ...prev, [jobName]: false }));
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '0ms';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const logColumns = [
    { 
      header: 'Job Name', 
      accessor: 'jobName', 
      render: (row) => (
        <span className="font-bold text-slate-800">
          {row.jobName.replace(/_/g, ' ').toUpperCase()}
        </span>
      ) 
    },
    { 
      header: 'Status', 
      accessor: 'status', 
      render: (row) => {
        if (row.status === 'success') {
          return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
              <CheckCircle size={10} />
              SUCCESS
            </span>
          );
        } else if (row.status === 'failed') {
          return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-100">
              <XCircle size={10} />
              FAILED
            </span>
          );
        } else {
          return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse">
              <Activity size={10} className="animate-spin" />
              RUNNING
            </span>
          );
        }
      } 
    },
    {
      header: 'Runtime Info',
      accessor: 'startedAt',
      render: (row) => (
        <div className="text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock size={11} className="text-slate-400" />
            {new Date(row.startedAt).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] font-bold text-slate-400 mt-0.5">
            Duration: {formatDuration(row.durationMs)}
          </div>
        </div>
      )
    },
    { 
      header: 'Execution Output', 
      accessor: 'message', 
      render: (row) => (
        <span className={`text-xs block max-w-sm truncate font-medium ${row.status === 'failed' ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
          {row.message || 'No log output.'}
        </span>
      ) 
    }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Clock className="text-primary-600" size={24} />
            Background Task Engine
          </h1>
          <p className="text-slate-500 text-xs md:text-sm">
            Monitor and manually execute automated inventory calculations, stock alerts, and customer notifications.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => { fetchJobsList(); fetchLogsList(1); }}
          className="flex items-center gap-1.5 text-xs font-bold py-2"
        >
          <RefreshCw size={14} />
          Refresh Engine
        </Button>
      </div>

      {loadingJobs ? (
        <div className="flex items-center justify-center py-12">
          <Loader size="md" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {jobs.map((job) => {
            const isRunning = job.lastRunStatus === 'running';
            const isTriggering = triggeringJob[job.name];

            return (
              <div 
                key={job.name} 
                className="bg-white rounded-xl border border-slate-100 shadow-soft p-5 flex flex-col justify-between space-y-4 hover:shadow-soft-lg transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-black text-slate-800 text-sm tracking-wide uppercase">{job.title}</h3>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                      job.lastRunStatus === 'success'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : job.lastRunStatus === 'failed'
                        ? 'bg-rose-50 text-rose-600 border-rose-100'
                        : job.lastRunStatus === 'running'
                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                        : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                      {job.lastRunStatus.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed min-h-[40px]">{job.description}</p>
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-650">
                    <Calendar size={12} className="text-slate-400" />
                    Schedule: {job.schedule}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-50 space-y-3">
                  <div className="text-[10px] font-bold text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>LAST RUN TIME:</span>
                      <span className="text-slate-650">
                        {job.lastRunTime ? new Date(job.lastRunTime).toLocaleString('en-IN') : 'NEVER'}
                      </span>
                    </div>
                    {job.lastRunTime && (
                      <div className="flex justify-between">
                        <span>DURATION:</span>
                        <span className="text-slate-650">{formatDuration(job.lastRunDurationMs)}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    disabled={isRunning || isTriggering}
                    onClick={() => handleRunJob(job.name)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 bg-gradient-to-r from-primary-600 to-emerald-600"
                  >
                    <Play size={12} className="fill-current" />
                    {isTriggering ? 'Starting...' : isRunning ? 'Job Running...' : 'Execute Now'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* History Log Section */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-soft overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <History size={14} className="text-slate-400" />
            Execution Log Registry
          </h3>
        </div>

        {loadingLogs ? (
          <div className="flex items-center justify-center py-16">
            <Loader size="sm" />
          </div>
        ) : (
          <Table 
            columns={logColumns} 
            data={logs} 
            pagination={pagination} 
            onPageChange={fetchLogsList} 
          />
        )}
      </div>
    </div>
  );
};

export default BackgroundJobs;
