import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Trash2,
  Upload,
  ArrowUp,
  ArrowDown,
  FilePlus,
  Play,
  Check,
  Loader2,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { API } from '../../services/api';

export default function CourseBuilder() {
  const { id } = useParams();

  const [course, setCourse] = useState(null);
  const [curriculum, setCurriculum] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // Form states
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);

  // New lecture modal/form states
  const [activeChapterForLecture, setActiveChapterForLecture] = useState(null);
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureUrl, setLectureUrl] = useState('');
  const [lectureDuration, setLectureDuration] = useState('10'); // in mins
  const [lectureFree, setLectureFree] = useState(false);
  const [lectureTranscript, setLectureTranscript] = useState('');

  // Resource upload states
  const [activeLectureForResource, setActiveLectureForResource] = useState(null);
  const [resourceType, setResourceType] = useState('pdf');
  const [resourceName, setResourceName] = useState('');
  const [resourceFile, setResourceFile] = useState(null);

  useEffect(() => {
    fetchCourseDetails();
  }, [id]);

  const fetchCourseDetails = async () => {
    try {
      const res = await API.get(`/courses/${id}`);
      setCourse(res.data.data.course);
      setCurriculum(res.data.data.curriculum || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadThumbnail = async (e) => {
    e.preventDefault();
    if (!thumbnailFile) return;

    setSaveLoading(true);
    const formData = new FormData();
    formData.append('thumbnail', thumbnailFile);

    try {
      await API.patch(`/courses/${id}/thumbnail`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Thumbnail updated successfully!');
      fetchCourseDetails();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Upload failed');
    } finally {
      setSaveLoading(false);
      setThumbnailFile(null);
    }
  };

  // Chapter handlers
  const handleAddChapter = async (e) => {
    e.preventDefault();
    if (!newChapterTitle.trim()) return;

    try {
      await API.post('/chapters', {
        title: newChapterTitle,
        courseId: id,
      });
      setNewChapterTitle('');
      fetchCourseDetails();
    } catch (err) {
      alert('Failed to add chapter');
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!window.confirm('Delete chapter? This will cascade-delete all its lectures.')) return;

    try {
      await API.delete(`/chapters/${chapterId}`);
      fetchCourseDetails();
    } catch (err) {
      alert('Failed to delete chapter');
    }
  };

  // Lecture handlers
  const handleAddLecture = async (e) => {
    e.preventDefault();
    if (!lectureTitle.trim() || !lectureUrl.trim()) return;

    try {
      await API.post('/lectures', {
        title: lectureTitle,
        chapterId: activeChapterForLecture,
        youtubeUrl: lectureUrl,
        duration: parseInt(lectureDuration) * 60 || 600, // convert mins to seconds
        isPreviewFree: lectureFree,
        transcript: lectureTranscript,
      });

      setLectureTitle('');
      setLectureUrl('');
      setLectureTranscript('');
      setActiveChapterForLecture(null);
      fetchCourseDetails();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to add lecture');
    }
  };

  const handleDeleteLecture = async (lectureId) => {
    if (!window.confirm('Delete lecture?')) return;

    try {
      await API.delete(`/lectures/${lectureId}`);
      fetchCourseDetails();
    } catch (err) {
      alert('Failed to delete lecture');
    }
  };

  // Resource attachment handlers
  const handleUploadResource = async (e) => {
    e.preventDefault();
    if (!resourceFile && resourceType !== 'link') return;

    setSaveLoading(true);
    const formData = new FormData();
    formData.append('type', resourceType);
    formData.append('fileName', resourceName || 'Resource');
    if (resourceFile) formData.append('file', resourceFile);

    try {
      await API.post(`/lectures/${activeLectureForResource}/resources`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Attachment uploaded successfully!');
      setResourceName('');
      setResourceFile(null);
      setActiveLectureForResource(null);
      fetchCourseDetails();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Upload failed');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteResource = async (lectureId, resourceId) => {
    if (!window.confirm('Delete attachment?')) return;

    try {
      await API.delete(`/lectures/${lectureId}/resources/${resourceId}`);
      fetchCourseDetails();
    } catch (err) {
      alert('Failed to remove resource');
    }
  };

  // Up/Down Reordering handlers
  const moveChapter = async (index, direction) => {
    const newCurriculum = [...curriculum];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newCurriculum.length) return;

    // Swap ordering parameters locally
    const temp = newCurriculum[index].order;
    newCurriculum[index].order = newCurriculum[targetIndex].order;
    newCurriculum[targetIndex].order = temp;

    // Build payload array
    const payload = newCurriculum.map((c) => ({ _id: c._id, order: c.order }));

    try {
      await API.patch('/chapters/reorder', { items: payload });
      fetchCourseDetails();
    } catch (err) {
      alert('Failed to reorder chapters');
    }
  };

  const moveLecture = async (chapterIdx, lectureIdx, direction) => {
    const chapter = curriculum[chapterIdx];
    const newLectures = [...chapter.lectures];
    const targetIdx = lectureIdx + direction;
    if (targetIdx < 0 || targetIdx >= newLectures.length) return;

    // Swap local ordering parameters
    const temp = newLectures[lectureIdx].order;
    newLectures[lectureIdx].order = newLectures[targetIdx].order;
    newLectures[targetIdx].order = temp;

    // Build payload
    const payload = newLectures.map((l) => ({ _id: l._id, order: l.order }));

    try {
      await API.patch('/lectures/reorder', { items: payload });
      fetchCourseDetails();
    } catch (err) {
      alert('Failed to reorder lectures');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh]">
        <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading course architect settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      
      {/* Header breadcrumb */}
      <div className="flex justify-between items-center border-b border-slate-900 pb-5">
        <div>
          <span className="text-xxs text-slate-500 font-semibold uppercase">
            <Link to="/teacher/dashboard" className="hover:underline">Dashboard</Link> / Edit
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1">Curriculum Architect</h1>
          <p className="text-xs text-slate-400 mt-1">Configure chapters, upload video modules, and attach lecture slide deck files</p>
        </div>

        <Link
          to="/teacher/dashboard"
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold text-white"
        >
          Back Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Thumbnail & Chapter Addition */}
        <div className="lg:col-span-1 space-y-6">
          {/* Thumbnail Box */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-slate-200">Course Thumbnail</h3>
            <div className="aspect-video w-full rounded-xl bg-slate-950 overflow-hidden relative border border-slate-850">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt="thumbnail" className="object-cover w-full h-full" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-slate-700 bg-slate-950">
                  <BookOpen className="h-10 w-10" />
                </div>
              )}
            </div>
            
            <form onSubmit={handleUploadThumbnail} className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => setThumbnailFile(e.target.files[0])}
                className="flex-1 text-xxs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-slate-950 file:text-slate-350 hover:file:bg-slate-900 cursor-pointer"
              />
              <button
                type="submit"
                disabled={saveLoading || !thumbnailFile}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xxs px-3 py-1.5 rounded transition-colors disabled:opacity-40"
              >
                Upload
              </button>
            </form>
          </div>

          {/* Add Chapter Form */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-slate-200">Add New Chapter</h3>
            <form onSubmit={handleAddChapter} className="space-y-3 text-xs">
              <input
                type="text"
                required
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="Chapter Title (e.g. Chapter 3: Routing)"
                className="w-full bg-slate-950 border border-slate-900 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500 placeholder-slate-700"
              />
              <button
                type="submit"
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-semibold py-2.5 rounded-xl transition-all"
              >
                Create Chapter
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Curriculum Outline accordion / lists */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-white">Curriculum Timeline</h2>
          
          {curriculum.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
              <AlertTriangle className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <h3 className="font-semibold text-white text-sm">No Curriculum Defined</h3>
              <p className="text-slate-500 text-xs mt-1">Use the panel on the left to add your first chapter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {curriculum.map((chapter, chapIdx) => (
                <div
                  key={chapter._id}
                  className="bg-slate-905 border border-slate-850/80 rounded-2xl overflow-hidden"
                >
                  {/* Chapter Header */}
                  <div className="bg-slate-900/60 px-5 py-4 border-b border-slate-850/40 flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-3.5">
                      {/* Sorting controls */}
                      <div className="flex flex-col space-y-0.5">
                        <button
                          onClick={() => moveChapter(chapIdx, -1)}
                          disabled={chapIdx === 0}
                          className="p-0.5 rounded hover:bg-slate-900 disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                        <button
                          onClick={() => moveChapter(chapIdx, 1)}
                          disabled={chapIdx === curriculum.length - 1}
                          className="p-0.5 rounded hover:bg-slate-900 disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                      </div>

                      <h3 className="font-bold text-slate-200">
                        {chapter.title}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => setActiveChapterForLecture(chapter._id)}
                        className="bg-slate-950 border border-slate-900 hover:border-slate-800 text-brand-400 font-semibold py-1.5 px-2.5 rounded-lg flex items-center space-x-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Lecture</span>
                      </button>
                      <button
                        onClick={() => handleDeleteChapter(chapter._id)}
                        className="text-slate-550 hover:text-red-400 p-1.5"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>

                  {/* Chapter Lectures list */}
                  <div className="divide-y divide-slate-850/30">
                    {chapter.lectures?.length === 0 ? (
                      <div className="p-4 text-slate-550 italic text-xxs">No lecture videos added yet. Click "Add Lecture".</div>
                    ) : (
                      chapter.lectures.map((lecture, lecIdx) => (
                        <div
                          key={lecture._id}
                          className="p-5 space-y-4 text-xs bg-slate-900/10"
                        >
                          {/* Title block */}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2.5">
                              {/* Sorting */}
                              <div className="flex space-x-0.5 shrink-0">
                                <button
                                  onClick={() => moveLecture(chapIdx, lecIdx, -1)}
                                  disabled={lecIdx === 0}
                                  className="p-0.5 rounded hover:bg-slate-950 disabled:opacity-30"
                                >
                                  <ArrowUp className="h-3 w-3 text-slate-400" />
                                </button>
                                <button
                                  onClick={() => moveLecture(chapIdx, lecIdx, 1)}
                                  disabled={lecIdx === chapter.lectures.length - 1}
                                  className="p-0.5 rounded hover:bg-slate-950 disabled:opacity-30"
                                >
                                  <ArrowDown className="h-3 w-3 text-slate-400" />
                                </button>
                              </div>

                              <Play className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                              <span className="font-semibold text-slate-300">{lecture.title}</span>
                              {lecture.isPreviewFree && (
                                <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-1.5 py-0.2 rounded border border-emerald-500/20 uppercase">
                                  Free Preview
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setActiveLectureForResource(lecture._id)}
                                className="text-slate-500 hover:text-indigo-400 font-semibold text-xxs flex items-center space-x-1"
                              >
                                <FilePlus className="h-3.5 w-3.5" />
                                <span>Add File</span>
                              </button>
                              <span className="text-slate-700">|</span>
                              <button
                                onClick={() => handleDeleteLecture(lecture._id)}
                                className="text-slate-650 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Resources array */}
                          {lecture.resources?.length > 0 && (
                            <div className="pl-6 space-y-2">
                              {lecture.resources.map((res) => (
                                <div
                                  key={res._id}
                                  className="bg-slate-950/60 border border-slate-900 rounded-lg p-2.5 flex items-center justify-between text-xxs"
                                >
                                  <div className="flex items-center space-x-2 text-slate-400">
                                    <FileText className="h-3.5 w-3.5 text-pink-400" />
                                    <span>{res.fileName} ({res.type})</span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteResource(lecture._id, res._id)}
                                    className="text-slate-600 hover:text-red-400 font-bold"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Add Lecture Modal */}
      {activeChapterForLecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-fade-in text-xs">
            <h3 className="text-lg font-bold text-white mb-4">Add Lecture to Chapter</h3>
            
            <form onSubmit={handleAddLecture} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Lecture Title</label>
                <input
                  type="text"
                  required
                  value={lectureTitle}
                  onChange={(e) => setLectureTitle(e.target.value)}
                  placeholder="e.g. 1.3 Routing Middlewares"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500 placeholder-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">YouTube URL or Video ID</label>
                  <input
                    type="text"
                    required
                    value={lectureUrl}
                    onChange={(e) => setLectureUrl(e.target.value)}
                    placeholder="youtube.com/watch?v=..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500 placeholder-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    required
                    value={lectureDuration}
                    onChange={(e) => setLectureDuration(e.target.value)}
                    placeholder="10"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500 placeholder-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPreviewFree"
                  checked={lectureFree}
                  onChange={(e) => setLectureFree(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-brand-600 focus:ring-0 focus:ring-offset-0"
                />
                <label htmlFor="isPreviewFree" className="font-semibold text-slate-350">
                  Allow Free Preview (Non-enrolled users can watch)
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Lecture Transcript (Optional, for AI Q&A)</label>
                <textarea
                  rows={4}
                  value={lectureTranscript}
                  onChange={(e) => setLectureTranscript(e.target.value)}
                  placeholder="Paste lecture audio script transcript text..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500 placeholder-slate-700"
                />
              </div>

              <div className="flex space-x-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveChapterForLecture(null)}
                  className="text-slate-450 hover:text-slate-200 border border-slate-850 px-4 py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2 rounded-xl"
                >
                  Add Lecture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Resource Attachment Modal */}
      {activeLectureForResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in text-xs">
            <h3 className="text-lg font-bold text-white mb-4">Attach Lecture File</h3>
            
            <form onSubmit={handleUploadResource} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">File Label Name</label>
                <input
                  type="text"
                  required
                  value={resourceName}
                  onChange={(e) => setResourceName(e.target.value)}
                  placeholder="e.g. Chapter_3_Code_Zip"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500 placeholder-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Resource Type</label>
                <select
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="ppt">PowerPoint (PPT/PPTX)</option>
                  <option value="zip">ZIP Archive</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Upload File (Max 50MB)</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setResourceFile(e.target.files[0])}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-400"
                />
              </div>

              <div className="flex space-x-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveLectureForResource(null)}
                  className="text-slate-450 hover:text-slate-200 border border-slate-850 px-4 py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2 rounded-xl"
                >
                  {saveLoading ? 'Uploading...' : 'Attach File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
