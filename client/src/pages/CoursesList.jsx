import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, SlidersHorizontal, BookOpen, Star, ArrowRight, Loader2 } from 'lucide-react';
import { API } from '../services/api';

export default function CoursesList() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [rating, setRating] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [sort, setSort] = useState('newest');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounced search text
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 450);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch courses on filter changes
  useEffect(() => {
    fetchCourses();
  }, [debouncedSearch, category, level, rating, priceRange, sort, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, level, rating, priceRange, sort]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 8,
        sort,
        search: debouncedSearch,
        category,
        level,
        rating,
        priceRange,
      };

      const res = await API.get('/courses', { params });
      setCourses(res.data.data);
      setPages(res.data.meta.pages);
      setTotal(res.data.meta.total);
    } catch (err) {
      console.error('Failed to load courses', err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setLevel('');
    setRating('');
    setPriceRange('');
    setSort('newest');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Course Discovery</h1>
          <p className="text-slate-400 text-sm mt-1">Explore our range of e-learning development tracks</p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, description..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder-slate-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Panel */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6 h-fit space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <span className="font-bold text-slate-200 flex items-center space-x-2 text-sm">
              <SlidersHorizontal className="h-4 w-4 text-brand-400" />
              <span>Filters</span>
            </span>
            <button
              onClick={clearFilters}
              className="text-xs text-brand-450 hover:underline"
            >
              Clear All
            </button>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-450 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">All Categories</option>
              <option value="Web Development">Web Development</option>
              <option value="Database Design">Database Design</option>
              <option value="AI Integration">AI Integration</option>
              <option value="Cloud Deployments">Cloud Deployments</option>
            </select>
          </div>

          {/* Level */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-455 mb-2">Difficulty</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-455 mb-2">Price Tier</label>
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">All Prices</option>
              <option value="0-0">Free Only</option>
              <option value="0-50">Under $50</option>
              <option value="50-100">$50 to $100</option>
              <option value="100-">Over $100</option>
            </select>
          </div>

          {/* Ratings */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-455 mb-2">Minimum Rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">Any Rating</option>
              <option value="4.5">4.5 & up ★</option>
              <option value="4.0">4.0 & up ★</option>
              <option value="3.5">3.5 & up ★</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-455 mb-2">Sort Results</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="newest">Newest first</option>
              <option value="popularity">Popularity</option>
              <option value="rating">Highest rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-4" />
              <p className="text-slate-400 text-sm">Searching curriculums...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="glass-panel rounded-2xl p-16 text-center">
              <BookOpen className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Courses Found</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                We couldn't find any courses matching your current search parameters. Try clearing your filters!
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                {courses.map((course) => (
                  <Link
                    key={course._id}
                    to={`/courses/${course._id}`}
                    className="glass-card rounded-2xl overflow-hidden flex flex-col group"
                  >
                    {/* Thumbnail wrapper */}
                    <div className="aspect-video w-full bg-slate-950 relative overflow-hidden">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-600 bg-slate-900">
                          <BookOpen className="h-12 w-12" />
                        </div>
                      )}
                      
                      {/* Price tag */}
                      <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-sm border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-bold text-brand-400">
                        {course.price === 0 ? 'Free' : `$${course.price.toFixed(2)}`}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-xxs text-brand-450 uppercase tracking-widest font-bold">
                          {course.category}
                        </span>
                        <h3 className="font-bold text-white mt-1 group-hover:text-brand-400 transition-colors line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                          {course.subtitle || course.description}
                        </p>
                      </div>

                      {/* Info bar */}
                      <div className="flex items-center justify-between border-t border-slate-900/60 pt-4 mt-4">
                        <span className="text-xxs text-slate-500">
                          By {course.teacherId?.name || 'Instructor'}
                        </span>
                        
                        <div className="flex items-center space-x-1">
                          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-semibold text-slate-200">
                            {course.ratingsAvg || '0.0'}
                          </span>
                          <span className="text-xxs text-slate-500">
                            ({course.ratingsCount})
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination controls */}
              {pages > 1 && (
                <div className="flex items-center justify-center space-x-2 pt-4 border-t border-slate-900/60">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs hover:border-slate-700 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-slate-400 px-2">
                    Page {page} of {pages}
                  </span>
                  <button
                    disabled={page === pages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs hover:border-slate-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
