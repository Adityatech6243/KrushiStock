import React from 'react';
import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import Loader from './Loader';

const Table = ({ columns, data, loading = false, onEdit, onDelete, pagination, onPageChange }) => {
  return (
    <div className="overflow-hidden bg-white rounded-xl shadow-soft border border-slate-100">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/70 sticky top-0 backdrop-blur-sm z-10">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {loading && (!data || data.length === 0) ? (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                  className="px-6 py-10"
                >
                  <Loader size="md" />
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-50/70 transition-colors">
                  {columns.map((column, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {column.render ? column.render(row) : row[column.accessor]}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            className="p-1 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                  className="px-6 py-10 text-center text-slate-400 text-sm font-medium"
                >
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {pagination && pagination.pages > 1 && (
        <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-slate-50/30">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className={`relative inline-flex items-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors`}
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">
                Showing <span className="font-semibold text-slate-700">{(pagination.page - 1) * 10 + 1}</span> to <span className="font-semibold text-slate-700">{Math.min(pagination.page * 10, pagination.total)}</span> of <span className="font-semibold text-slate-700">{pagination.total}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden" aria-label="Pagination">
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`relative inline-flex items-center px-2.5 py-2 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors border-r border-slate-200`}
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold border-r border-slate-200 transition-colors ${
                      pagination.page === pageNum
                        ? 'bg-primary-50 text-primary-700'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className={`relative inline-flex items-center px-2.5 py-2 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors`}
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight size={16} />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
