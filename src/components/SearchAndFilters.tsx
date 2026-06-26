import React, { useState } from 'react';
import { FilterOptions, SortBy, SortOrder } from '../types';
import { Search, SlidersHorizontal, X, ArrowUpDown, Calendar, Database, Eye } from 'lucide-react';

interface SearchAndFiltersProps {
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  sortBy: SortBy;
  setSortBy: (field: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  allTags: string[];
}

export default function SearchAndFilters({
  filters,
  setFilters,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  allTags
}: SearchAndFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, type: e.target.value }));
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, tag: e.target.value }));
  };

  const handleSizeChange = (field: 'minSize' | 'maxSize', value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10) * 1024; // convert KB to Bytes
    setFilters(prev => ({ ...prev, [field]: numValue }));
  };

  const handleDateChange = (field: 'dateMin' | 'dateMax', value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      minSize: null,
      maxSize: null,
      dateMin: '',
      dateMax: '',
      tag: ''
    });
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const isFiltered = 
    filters.search !== '' ||
    filters.type !== 'all' ||
    filters.minSize !== null ||
    filters.maxSize !== null ||
    filters.dateMin !== '' ||
    filters.dateMax !== '' ||
    filters.tag !== '';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3" id="search-and-filters">
      {/* Primary search row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files, folders or descriptions..."
            value={filters.search}
            onChange={handleTextChange}
            id="search-input"
            className="w-full text-sm pl-[38px] pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-semibold text-slate-700 placeholder-slate-400"
          />
          {filters.search && (
            <button
              onClick={() => setFilters(p => ({ ...p, search: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full text-gray-400"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {/* Advanced Filter Collapse Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 px-4 py-2 h-9 border rounded-md text-xs font-semibold transition-all cursor-pointer ${
              showAdvanced || isFiltered
                ? 'bg-[#eff6ff] text-[#3b82f6] border-[#bfdbfe]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden md:inline">Filters</span>
            {isFiltered && (
              <span className="w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </button>

          {/* Sort Menu integrated cleanly */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-3 h-9">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden lg:inline px-1">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="text-xs bg-transparent border-none text-slate-600 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="type">File Type</option>
              <option value="updatedAt">Date Modified</option>
              <option value="createdAt">Date Created</option>
            </select>
            <button
              onClick={toggleSortOrder}
              title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
              className="p-1 hover:bg-gray-200 rounded text-gray-500 cursor-pointer"
            >
              <ArrowUpDown className={`h-4 w-4 transform transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Drawer */}
      {showAdvanced && (
        <div className="border-t border-gray-100 pt-3 mt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
          {/* By Type */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              Category
            </label>
            <select
              value={filters.type}
              onChange={handleTypeChange}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 font-medium focus:outline-hidden"
            >
              <option value="all">All File Types</option>
              <option value="documents">Documents</option>
              <option value="images">Images</option>
              <option value="videos">Videos</option>
              <option value="audio">Audio</option>
              <option value="archives">Archives</option>
              <option value="others">Others</option>
            </select>
          </div>

          {/* By Tag */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              Tag / Label
            </label>
            <select
              value={filters.tag}
              onChange={handleTagChange}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 font-medium focus:outline-hidden"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {/* By Size Range (KB) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              Size Range (KB)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                min="0"
                value={filters.minSize !== null ? filters.minSize / 1024 : ''}
                onChange={(e) => handleSizeChange('minSize', e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-hidden"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="number"
                placeholder="Max"
                min="0"
                value={filters.maxSize !== null ? filters.maxSize / 1024 : ''}
                onChange={(e) => handleSizeChange('maxSize', e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* By Date range */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              Modified Date
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.dateMin}
                onChange={(e) => handleDateChange('dateMin', e.target.value)}
                className="w-full text-[10px] bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-1.5 text-gray-600 focus:outline-hidden"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={filters.dateMax}
                onChange={(e) => handleDateChange('dateMax', e.target.value)}
                className="w-full text-[10px] bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-1.5 text-gray-600 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* Filter indicator footer */}
      {isFiltered && (
        <div className="flex items-center justify-between bg-blue-50/50 rounded-lg px-3 py-1.5 border border-blue-100/50">
          <div className="flex gap-1.5 items-center flex-wrap">
            <span className="text-[10px] bg-blue-600 text-white rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">Active Search</span>
            {filters.type !== 'all' && (
              <span className="text-xs text-blue-800 font-medium">Type: {filters.type}</span>
            )}
            {filters.tag !== '' && (
              <span className="text-xs text-blue-800 font-medium">Tag: {filters.tag}</span>
            )}
            {(filters.minSize !== null || filters.maxSize !== null) && (
              <span className="text-xs text-blue-800 font-medium">
                Size: {filters.minSize ? `${filters.minSize / 1024}kB` : '0'} - {filters.maxSize ? `${filters.maxSize / 1024}kB` : '∞'}
              </span>
            )}
            {(filters.dateMin !== '' || filters.dateMax !== '') && (
              <span className="text-xs text-blue-800 font-medium">Date Range Selected</span>
            )}
          </div>
          <button
            onClick={clearFilters}
            className="text-xs text-blue-700 hover:text-blue-900 font-semibold underline flex items-center gap-1 cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
