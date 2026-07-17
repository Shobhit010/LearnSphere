import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import YouTube from 'react-youtube';
import confetti from 'canvas-confetti';
import {
  Play,
  CheckCircle,
  Circle,
  BookOpen,
  Brain,
  HelpCircle,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  MessageCircle,
  Send,
  Loader2,
  Award,
  Trophy,
  XCircle,
} from 'lucide-react';
import { API } from '../../services/api';

export default function CoursePlayer() {
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [curriculum, setCurriculum] = useState([]);
  const [activeLecture, setActiveLecture] = useState(null);
  const [progress, setProgress] = useState({ completedLectures: [], percentComplete: 0 });
  
  // Loading indicators
  const [loading, setLoading] = useState(true);
  const [progressUpdating, setProgressUpdating] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState('assistant'); // 'assistant', 'quiz', 'forum', 'resources'

  // Accordion state
  const [expandedChapters, setExpandedChapters] = useState({});

  // 1. AI Assistant State
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiChat, setAiChat] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  // 2. Practice Quiz State
  const [quiz, setQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);

  // 3. Discussion Forum State
  const [forumPosts, setForumPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [replyContents, setReplyContents] = useState({}); // { postId: string }
  const [activeReplyId, setActiveReplyId] = useState(null);

  // Load Course and curriculum
  useEffect(() => {
    fetchCourseAndCurriculum();
  }, [courseId]);

  // Load active lecture specific data (Forum posts)
  useEffect(() => {
    if (activeLecture) {
      fetchForumPosts();
      setQuiz(null);
      setQuizResult(null);
      setQuizAnswers({});
    }
  }, [activeLecture]);

  const fetchCourseAndCurriculum = async () => {
    try {
      const res = await API.get(`/courses/${courseId}`);
      const data = res.data.data;
      
      setCourse(data.course);
      setCurriculum(data.curriculum);

      // Fetch progress
      const progressRes = await API.get(`/progress/course/${courseId}`);
      setProgress(progressRes.data.data);

      // Expand first chapter by default
      if (data.curriculum?.length > 0) {
        setExpandedChapters({ [data.curriculum[0]._id]: true });
        
        // Find last accessed lecture or default to first lecture
        const progressRecord = progressRes.data.data;
        let defaultLecture = null;
        
        if (progressRecord?.lastAccessedLecture) {
          // Find last accessed in curriculum
          for (const chap of data.curriculum) {
            const found = chap.lectures?.find(l => l._id.toString() === progressRecord.lastAccessedLecture.toString());
            if (found) {
              defaultLecture = found;
              // Expand its chapter
              setExpandedChapters(prev => ({ ...prev, [chap._id]: true }));
              break;
            }
          }
        }

        if (!defaultLecture) {
          defaultLecture = data.curriculum[0].lectures?.[0];
        }

        setActiveLecture(defaultLecture);
      }
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchForumPosts = async () => {
    if (!activeLecture) return;
    try {
      const res = await API.get(`/forums/lecture/${activeLecture._id}`);
      setForumPosts(res.data.data);
    } catch (err) {
      console.error(err.message);
    }
  };

  const toggleChapter = (id) => {
    setExpandedChapters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle Lecture Watch Completion
  const handleToggleComplete = async () => {
    if (!activeLecture || progressUpdating) return;
    
    setProgressUpdating(true);
    const isCompleted = progress.completedLectures.includes(activeLecture._id);

    try {
      const res = await API.patch(
        `/progress/course/${courseId}/lecture/${activeLecture._id}`,
        { completed: !isCompleted }
      );

      const updateData = res.data.data;
      setProgress(updateData.progress);

      // Trigger Confetti and Certificate alert if they hit 100%
      if (updateData.certificateGenerated) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error('Failed to update progress', err.message);
    } finally {
      setProgressUpdating(false);
    }
  };

  // AI assistant submit
  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!aiQuestion.trim() || aiLoading) return;

    const userMessage = { role: 'user', content: aiQuestion };
    setAiChat((prev) => [...prev, userMessage]);
    setAiQuestion('');
    setAiLoading(true);

    try {
      const res = await API.post(`/ai/lecture/${activeLecture._id}/ask`, {
        question: aiQuestion,
      });

      const assistantMessage = { role: 'assistant', content: res.data.data.answer };
      setAiChat((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      const errorMessage = {
        role: 'assistant',
        content: '[Error] Unable to reach the AI assistant. Please try again.',
      };
      setAiChat((prev) => [...prev, errorMessage]);
    } finally {
      setAiLoading(false);
    }
  };

  // Fetch practice quiz
  const handleFetchQuiz = async () => {
    setQuizLoading(true);
    setQuizResult(null);
    setQuizAnswers({});

    try {
      const res = await API.get(`/quizzes/chapter/${activeLecture.chapterId}`);
      setQuiz(res.data.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error?.message || 'Failed to generate quiz for this chapter');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSelectQuizOption = (qId, optionIdx) => {
    setQuizAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
  };

  const handleSubmitQuiz = async () => {
    // Check all questions answered
    const unanswered = quiz.questions.some((q) => quizAnswers[q._id] === undefined);
    if (unanswered) {
      alert('Please answer all questions before submitting.');
      return;
    }

    setQuizLoading(true);
    try {
      const formattedAnswers = quiz.questions.map((q) => quizAnswers[q._id]);
      
      const res = await API.post(`/quizzes/${quiz._id}/attempt`, {
        answers: formattedAnswers,
      });

      setQuizResult(res.data.data);
      if (res.data.data.score === 100) {
        confetti({ particleCount: 80, spread: 60 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setQuizLoading(false);
    }
  };

  // Forum submit post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    try {
      await API.post(`/forums/lecture/${activeLecture._id}`, {
        content: newPostContent,
      });
      setNewPostContent('');
      fetchForumPosts();
    } catch (err) {
      console.error(err.message);
    }
  };

  // Forum submit reply
  const handleCreateReply = async (e, parentId) => {
    e.preventDefault();
    const content = replyContents[parentId];
    if (!content || !content.trim()) return;

    try {
      await API.post(`/forums/lecture/${activeLecture._id}`, {
        content,
        parentPostId: parentId,
      });
      setReplyContents((prev) => ({ ...prev, [parentId]: '' }));
      setActiveReplyId(null);
      fetchForumPosts();
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleToggleUpvote = async (id) => {
    try {
      await API.patch(`/forums/${id}/upvote`);
      fetchForumPosts();
    } catch (err) {
      console.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh]">
        <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Initializing player settings...</p>
      </div>
    );
  }

  const isLectureCompleted = activeLecture && progress.completedLectures.includes(activeLecture._id);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Player (order-1) */}
        <div className="lg:col-span-2 space-y-6 order-1">
          
          {/* YouTube Video Player Wrapper */}
          {activeLecture ? (
            <div className="space-y-4">
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-850 relative">
                <YouTube
                  videoId={activeLecture.youtubeVideoId}
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: {
                      autoplay: 0,
                      modestbranding: 1,
                      rel: 0,
                    },
                  }}
                  className="w-full h-full"
                />
              </div>

              {/* Player title and complete toggle */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/40 p-4 border border-slate-900 rounded-xl">
                <div>
                  <h1 className="font-extrabold text-white text-lg sm:text-xl line-clamp-1">{activeLecture.title}</h1>
                  <span className="text-xxs text-slate-500 mt-1 block">Video Duration: {Math.round(activeLecture.duration / 60)} minutes</span>
                </div>

                <button
                  onClick={handleToggleComplete}
                  disabled={progressUpdating}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center space-x-2 transition-all shrink-0 border ${
                    isLectureCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  {progressUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isLectureCompleted ? (
                    <CheckCircle className="h-4 w-4 fill-emerald-500/20" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  <span>{isLectureCompleted ? 'Lecture Completed' : 'Mark Completed'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="aspect-video w-full rounded-2xl bg-slate-950/80 flex flex-col items-center justify-center border border-slate-850 p-8 text-center">
              <BookOpen className="h-12 w-12 text-slate-600 mb-3" />
              <h3 className="font-bold text-white text-base">Select a Lecture to Begin</h3>
              <p className="text-slate-500 text-xs mt-1">Use the syllabus sidebar to select modules.</p>
            </div>
          )}
        </div>

        {/* Player Tab Widget Area (order-3 on mobile, order-2 on desktop) */}
        <div className="lg:col-span-2 space-y-6 order-3 lg:order-2">
          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-850">
            {/* Header Tabs */}
            <div className="flex border-b border-slate-850 overflow-x-auto divide-x divide-slate-850">
              <button
                onClick={() => setActiveTab('assistant')}
                className={`px-5 py-3.5 text-xs font-semibold flex items-center space-x-2 shrink-0 ${
                  activeTab === 'assistant' ? 'bg-slate-900 text-brand-400 border-b-2 border-brand-500' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Brain className="h-4 w-4" />
                <span>AI Tutor</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('quiz');
                  if (!quiz && activeLecture) handleFetchQuiz();
                }}
                className={`px-5 py-3.5 text-xs font-semibold flex items-center space-x-2 shrink-0 ${
                  activeTab === 'quiz' ? 'bg-slate-900 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-white'
                }`}
              >
                <HelpCircle className="h-4 w-4" />
                <span>Practice Quiz</span>
              </button>

              <button
                onClick={() => setActiveTab('forum')}
                className={`px-5 py-3.5 text-xs font-semibold flex items-center space-x-2 shrink-0 ${
                  activeTab === 'forum' ? 'bg-slate-900 text-violet-400 border-b-2 border-violet-500' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Lecture Forums</span>
              </button>

              <button
                onClick={() => setActiveTab('resources')}
                className={`px-5 py-3.5 text-xs font-semibold flex items-center space-x-2 shrink-0 ${
                  activeTab === 'resources' ? 'bg-slate-900 text-pink-400 border-b-2 border-pink-500' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Attachments ({activeLecture?.resources?.length || 0})</span>
              </button>
            </div>

            {/* Tab content panel */}
            <div className="p-6">
              
              {/* Tab 1: AI Assistant */}
              {activeTab === 'assistant' && (
                <div className="space-y-6">
                  {/* Chat logs */}
                  <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
                    {aiChat.length === 0 ? (
                      <div className="text-center py-8 text-slate-550 text-xs">
                        <Brain className="h-8 w-8 text-slate-650 mx-auto mb-2" />
                        <span>Type a question below. The AI Video Assistant will respond using lecture transcript details.</span>
                      </div>
                    ) : (
                      aiChat.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start space-x-3 text-xs ${
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {msg.role !== 'user' && (
                            <div className="h-6 w-6 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center shrink-0 font-bold text-xxs">
                              AI
                            </div>
                          )}
                          <div
                            className={`p-3 rounded-2xl max-w-sm leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-brand-600 text-white rounded-tr-none'
                                : 'bg-slate-950 text-slate-350 rounded-tl-none border border-slate-900'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))
                    )}
                    {aiLoading && (
                      <div className="flex items-center space-x-2 text-xxs text-slate-450 italic">
                        <Loader2 className="h-3 w-3 animate-spin text-brand-400" />
                        <span>AI Tutor is formulating response...</span>
                      </div>
                    )}
                  </div>

                  {/* Ask Form */}
                  <form onSubmit={handleAskAI} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      placeholder="Ask something about this video..."
                      className="flex-1 bg-slate-950 border border-slate-900 focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !aiQuestion.trim()}
                      className="bg-brand-600 hover:bg-brand-700 disabled:bg-brand-850 px-4 py-2.5 rounded-xl text-white transition-colors flex items-center focus:outline-none"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 2: Chapter Quizzes */}
              {activeTab === 'quiz' && (
                <div>
                  {quizLoading ? (
                    <div className="flex flex-col items-center justify-center py-10">
                      <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
                      <p className="text-slate-450 text-xs">Loading practice quiz...</p>
                    </div>
                  ) : !quiz ? (
                    <div className="text-center py-8 text-slate-550 text-xs">
                      <span>No quiz loaded. Select a lecture to generate a practice quiz.</span>
                    </div>
                  ) : quizResult ? (
                    /* Quiz Results Panel */
                    <div className="space-y-6 animate-fade-in text-xs">
                      <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-6 text-center space-y-4 shadow-lg relative overflow-hidden">
                        {/* Background subtle glowing circles */}
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-brand-500/5 rounded-full blur-xl" />
                        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl" />

                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                          <Trophy className="h-8 w-8 animate-bounce-slow" />
                        </div>
                        
                        <div className="space-y-1.5">
                          <h4 className="font-black text-white text-base">Practice Quiz Results</h4>
                          <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                            Chapter Review • {quizResult.totalQuestionsCount} Questions
                          </p>
                        </div>

                        <div className="py-2">
                          <div className="max-w-[240px] mx-auto bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                            <span className="text-slate-400 font-medium ml-1">Final Score:</span>
                            <span className={`text-base font-black mr-1 ${
                              quizResult.score >= 80 ? 'text-emerald-400' : quizResult.score >= 50 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                              {quizResult.score}%
                            </span>
                          </div>
                          
                          <p className="text-xxs text-slate-550 mt-2">
                            You answered {quizResult.correctAnswersCount} correct out of {quizResult.totalQuestionsCount} questions
                          </p>

                          <p className="text-[11px] text-slate-350 italic mt-3.5 px-4 leading-relaxed">
                            {quizResult.score === 100 
                              ? '🏆 Perfect Score! Outstanding understanding of the materials.'
                              : quizResult.score >= 80
                              ? '🎉 Great job! You have fully mastered this chapter.'
                              : quizResult.score >= 50
                              ? '👍 Good attempt! Review the questions below to secure a higher mark.'
                              : '💪 Keep studying and retake the quiz to improve your score.'
                            }
                          </p>
                        </div>
                      </div>

                      <div className="space-y-5">
                        {quizResult.results.map((q, idx) => (
                          <div key={idx} className="space-y-3.5 border-b border-slate-900/60 pb-5">
                            <p className="font-bold text-slate-200">
                              {idx + 1}. {q.questionText}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xxs">
                              {q.options.map((opt, oIdx) => {
                                const isSelected = q.selectedOptionIndex === oIdx;
                                const isCorrectOpt = q.correctOptionIndex === oIdx;
                                return (
                                  <div
                                    key={oIdx}
                                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                      isCorrectOpt
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
                                        : isSelected
                                        ? 'bg-red-500/10 border-red-500/30 text-red-400 font-medium'
                                        : 'bg-slate-950 border-slate-900 text-slate-450'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <span className="text-slate-550 font-mono text-[10px] uppercase">
                                        {String.fromCharCode(65 + oIdx)}.
                                      </span>
                                      <span>{opt}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 shrink-0">
                                      {isSelected && (
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                          isCorrectOpt ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                        }`}>
                                          Your Choice
                                        </span>
                                      )}
                                      {isCorrectOpt ? (
                                        <CheckCircle className="h-4 w-4 text-emerald-400 fill-emerald-500/10 shrink-0" />
                                      ) : isSelected ? (
                                        <XCircle className="h-4 w-4 text-red-400 fill-red-500/10 shrink-0" />
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {q.explanation && (
                              <div className="bg-slate-950/40 border border-slate-900/60 rounded-xl p-3 mt-2 text-xxs text-slate-400 leading-relaxed">
                                <span className="font-bold text-slate-350 uppercase tracking-wide text-[9px] block mb-1">
                                  Explanation
                                </span>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleFetchQuiz}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-98"
                      >
                        Retake Quiz
                      </button>
                    </div>
                  ) : (
                    /* Interactive Quiz Questions */
                    <div className="space-y-6 text-xs">
                      {quiz.questions.map((q, qIdx) => (
                        <div key={q._id} className="space-y-3">
                          <p className="font-bold text-slate-300">
                            {qIdx + 1}. {q.questionText}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {q.options.map((opt, oIdx) => {
                              const isChecked = quizAnswers[q._id] === oIdx;
                              return (
                                <button
                                  key={oIdx}
                                  onClick={() => handleSelectQuizOption(q._id, oIdx)}
                                  className={`p-3 rounded-xl border text-left transition-colors flex items-center justify-between hover:border-brand-500/40 ${
                                    isChecked
                                      ? 'bg-brand-950/15 border-brand-500/60 text-brand-350 font-semibold'
                                      : 'bg-slate-950 border-slate-900 text-slate-400'
                                  }`}
                                >
                                  <span>{opt}</span>
                                  <span className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    isChecked ? 'border-brand-500 bg-brand-500' : 'border-slate-800'
                                  }`}>
                                    {isChecked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={handleSubmitQuiz}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-colors active:scale-98 shadow-md"
                      >
                        Submit Answers
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Discussion Forum */}
              {activeTab === 'forum' && (
                <div className="space-y-6">
                  {/* Create New Thread */}
                  <form onSubmit={handleCreatePost} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Ask a question in this discussion forum..."
                      className="flex-1 bg-slate-950 border border-slate-900 focus:border-brand-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
                    />
                    <button
                      type="submit"
                      className="bg-brand-600 hover:bg-brand-700 px-4 py-2.5 rounded-xl text-white transition-colors focus:outline-none"
                    >
                      Post
                    </button>
                  </form>

                  {/* Forum Threads List */}
                  <div className="space-y-4 max-h-72 overflow-y-auto pr-2 divide-y divide-slate-850/40">
                    {forumPosts.length === 0 ? (
                      <div className="text-center py-8 text-slate-550 text-xs">
                        <MessageSquare className="h-8 w-8 text-slate-650 mx-auto mb-2" />
                        <span>No questions posted. Be the first to start a thread!</span>
                      </div>
                    ) : (
                      forumPosts.map((post) => (
                        <div key={post._id} className="pt-4 first:pt-0 space-y-3 text-xs">
                          {/* Thread Post */}
                          <div className="flex justify-between items-start">
                            <div className="flex items-start space-x-2.5">
                              <div className="h-7 w-7 rounded-full bg-slate-800 text-white font-bold text-xxs flex items-center justify-center shrink-0">
                                {post.userId?.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-slate-200">{post.userId?.name}</span>
                                  {post.userId?.role === 'teacher' && (
                                    <span className="bg-brand-600/10 text-brand-400 border border-brand-600/25 px-1.5 py-0.1 rounded text-xxs font-extrabold uppercase scale-90">
                                      Instructor
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-350 mt-1 leading-relaxed">{post.content}</p>
                              </div>
                            </div>

                            {/* Upvote button */}
                            <button
                              onClick={() => handleToggleUpvote(post._id)}
                              className={`flex items-center space-x-1 py-1 px-2 border rounded-lg text-xxs transition-colors ${
                                post.isUpvoted
                                  ? 'bg-brand-950/20 border-brand-500/30 text-brand-400 font-bold'
                                  : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-350'
                              }`}
                            >
                              <ThumbsUp className="h-3 w-3" />
                              <span>{post.upvotesCount}</span>
                            </button>
                          </div>

                          {/* Reply details */}
                          <div className="pl-9 space-y-3">
                            {post.replies?.map((rep) => (
                              <div key={rep._id} className="flex justify-between items-start bg-slate-950/30 border border-slate-900/60 p-2.5 rounded-lg">
                                <div className="flex items-start space-x-2">
                                  <div className="h-6 w-6 rounded-full bg-slate-900 text-white font-bold text-xxs flex items-center justify-center shrink-0">
                                    {rep.userId?.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-1.5">
                                      <span className="font-bold text-slate-300">{rep.userId?.name}</span>
                                      {rep.userId?.role === 'teacher' && (
                                        <span className="bg-brand-600/10 text-brand-400 border border-brand-600/25 px-1.5 py-0.1 rounded text-xxs font-extrabold uppercase scale-90">
                                          Instructor
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-slate-400 mt-0.5 leading-relaxed">{rep.content}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleToggleUpvote(rep._id)}
                                  className={`flex items-center space-x-1.5 text-xxs ${
                                    rep.isUpvoted ? 'text-brand-400 font-bold' : 'text-slate-500'
                                  }`}
                                >
                                  <ThumbsUp className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ))}

                            {/* Reply Input Trigger */}
                            {activeReplyId === post._id ? (
                              <form
                                onSubmit={(e) => handleCreateReply(e, post._id)}
                                className="flex gap-2"
                              >
                                <input
                                  type="text"
                                  required
                                  value={replyContents[post._id] || ''}
                                  onChange={(e) =>
                                    setReplyContents((prev) => ({ ...prev, [post._id]: e.target.value }))
                                  }
                                  placeholder="Write a reply..."
                                  className="flex-1 bg-slate-950 border border-slate-900 rounded-lg py-1.5 px-3 text-xxs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                                />
                                <button
                                  type="submit"
                                  className="bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg text-white font-semibold text-xxs"
                                >
                                  Reply
                                </button>
                              </form>
                            ) : (
                              <button
                                onClick={() => setActiveReplyId(post._id)}
                                className="text-xxs text-brand-450 hover:underline flex items-center space-x-1"
                              >
                                <MessageCircle className="h-3 w-3 shrink-0" />
                                <span>Write a reply...</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Lecture Resource list */}
              {activeTab === 'resources' && (
                <div className="space-y-4">
                  {activeLecture?.resources?.length === 0 ? (
                    <div className="text-center py-8 text-slate-550 text-xs">
                      <FileText className="h-8 w-8 text-slate-650 mx-auto mb-2" />
                      <span>No downloadable attachments added to this lecture.</span>
                    </div>
                  ) : (
                    activeLecture?.resources?.map((res, idx) => (
                      <div
                        key={res._id || idx}
                        className="glass-panel border border-slate-900 rounded-xl p-4 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center space-x-3.5 text-xs">
                          <div className="h-9 w-9 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center text-pink-400 shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-200 line-clamp-1">{res.fileName}</p>
                            <span className="text-xxs text-slate-500 uppercase tracking-widest block mt-0.5 font-semibold">
                              {res.type} {res.size ? `• ${(res.size / 1024 / 1024).toFixed(2)} MB` : ''}
                            </span>
                          </div>
                        </div>

                        <a
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-slate-950 border border-slate-900 hover:border-slate-800 text-white font-semibold text-xxs py-2 px-3 rounded-lg transition-colors shrink-0"
                        >
                          Download
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Right Column: Course Player Curriculum Sidebar (order-2 on mobile, order-3 on desktop) */}
        <div className="lg:col-span-1 space-y-6 order-2 lg:order-3 lg:row-span-2">
          <div className="glass-panel rounded-2xl p-5 border border-slate-850 space-y-5">
            {/* Header progress bar */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-2">
                <span className="text-slate-350">Curriculum Progress</span>
                <span className="text-brand-400">{progress.percentComplete}% Complete</span>
              </div>
              <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress.percentComplete}%` }}
                />
              </div>
            </div>

            {/* Certificate generate link if progress is 100% */}
            {progress.percentComplete === 100 && (
              <Link
                to={`/verify-certificate/${courseId}`} // Verifies locally or checks list
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-95 text-slate-950 font-extrabold text-xs py-3 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-amber-500/10 active:scale-[0.98]"
              >
                <Award className="h-5.5 w-5.5 fill-slate-950" />
                <span>Claim Verified Certificate</span>
              </Link>
            )}

            {/* Curriculum syllabus list */}
            <div className="space-y-3.5">
              {curriculum.map((chapter) => {
                const isOpen = !!expandedChapters[chapter._id];
                return (
                  <div key={chapter._id} className="space-y-1">
                    {/* Chapter Accordion Trigger */}
                    <button
                      onClick={() => toggleChapter(chapter._id)}
                      className="w-full flex items-center justify-between bg-slate-950/60 hover:bg-slate-950 p-3.5 rounded-xl border border-slate-900 transition-colors"
                    >
                      <h4 className="text-left font-bold text-slate-300 text-xs line-clamp-1">
                        {chapter.title}
                      </h4>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                      )}
                    </button>

                    {/* Chapter Lectures list */}
                    {isOpen && (
                      <div className="pl-2 space-y-1.5 pt-1.5 animate-fade-in">
                        {chapter.lectures?.map((lecture) => {
                          const isSelected = activeLecture?._id === lecture._id;
                          const isCompleted = progress.completedLectures.includes(lecture._id);
                          return (
                            <button
                              key={lecture._id}
                              onClick={() => setActiveLecture(lecture)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs transition-all ${
                                isSelected
                                  ? 'bg-brand-950/15 border-brand-500/60 text-brand-350'
                                  : 'bg-slate-900/30 border-slate-900/60 text-slate-450 hover:bg-slate-900/50'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                {isCompleted ? (
                                  <CheckCircle className="h-4 w-4 text-emerald-450 fill-emerald-500/10 shrink-0" />
                                ) : (
                                  <Circle className="h-4 w-4 text-slate-750 shrink-0" />
                                )}
                                <span className="line-clamp-1">{lecture.title}</span>
                              </div>

                              <span className="text-xxs text-slate-600 shrink-0 pl-2">
                                {Math.round(lecture.duration / 60)}m
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
