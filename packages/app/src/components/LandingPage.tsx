import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [fadeToBlack, setFadeToBlack] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Detect system dark mode preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.15 }
    );

    const sections = document.querySelectorAll('[data-animate]');
    sections.forEach((section) => {
      if (observerRef.current) observerRef.current.observe(section);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const handleGetStarted = () => {
    setFadeToBlack(true);
    setTimeout(() => {
      navigate('/login');
    }, 2500);
  };

  const handleBottomGetStarted = () => {
    // Smoothly scroll the window to the top of the page
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    // Trigger the same fade-out and navigation logic as the top button
    handleGetStarted();
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Animated Background with fade overlay */}
      <div className={`fixed inset-0 z-0 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 animate-gradient transition-opacity duration-[2500ms] ${fadeToBlack ? 'opacity-0' : 'opacity-100'}`}></div>
      <div className={`fixed inset-0 z-0 ${isDarkMode ? 'bg-black' : 'bg-white'} transition-opacity duration-[2500ms] ${fadeToBlack ? 'opacity-100' : 'opacity-0'}`}></div>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 400% 400%;
          animation: gradient 15s ease infinite;
        }
        .slide-in-left {
          animation: slideInLeft 1.2s ease-out forwards;
        }
        .fade-in {
          animation: fadeIn 1.5s ease-out forwards;
        }
        .fade-up {
          animation: fadeUp 1s ease-out forwards;
        }
        .word-by-word span {
          opacity: 0;
          display: inline-block;
          animation: fadeInWord 0.5s ease-out forwards;
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-100px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInWord {
          to { opacity: 1; }
        }
        .shard {
          background-color: white;
          position: absolute;
          opacity: 0;
          animation: floatIn 2s ease-out forwards;
        }
        @keyframes floatIn {
          from {
            opacity: 0;
            transform: translate(var(--tx-start), var(--ty-start)) scale(0.5);
          }
          to {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
        }
        @keyframes fadeInFromLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInFromRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .list-item { opacity: 0; }
        .list-item-1 { animation: fadeInFromLeft 0.8s ease-out 0.3s forwards; }
        .list-item-2 { animation: fadeInFromRight 0.8s ease-out 0.8s forwards; }
        .list-item-3 { animation: fadeInFromLeft 0.8s ease-out 1.3s forwards; }
        .list-item-4 { animation: fadeInFromRight 0.8s ease-out 1.8s forwards; }
        .list-item-5 { animation: fadeInFromLeft 0.8s ease-out 2.3s forwards; }
        .fade-up-late {
          opacity: 0;
          animation: fadeUp 1s ease-out 2s forwards;
        }
      `}</style>

      <div className={`relative z-10 transition-colors duration-[2500ms] ${fadeToBlack ? 'text-white' : 'text-white'}`}>
        {/* HERO SECTION */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">
          {/* Floating Shards Background */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-[1500ms] ${fadeToBlack ? 'opacity-0' : ''}`}>
            <div className="relative w-full h-64 md:h-80">
              {Array.from({ length: 50 }).map((_, i) => {
                const col = i % 10;
                const row = Math.floor(i / 10);
                const style = {
                  '--tx-start': `${(Math.random() - 0.5) * 200}vw`,
                  '--ty-start': `${(Math.random() - 0.5) * 200}vh`,
                  left: `${col * 10}%`,
                  top: `${row * 20}%`,
                  animationDelay: `${Math.random() * 1}s`,
                  width: '10%',
                  height: '20%'
                } as React.CSSProperties;
                return <div key={i} className="shard" style={style} />;
              })}
            </div>
          </div>

          <div className="relative z-10 text-center max-w-5xl">
            <h1 className={`text-7xl md:text-8xl font-extrabold mb-8 drop-shadow-2xl transition-colors duration-[2500ms] ${fadeToBlack ? 'text-white' : 'text-black'}`}>
              AI Resume & Interview Trainer
            </h1>
            <p className={`text-2xl md:text-3xl mb-16 drop-shadow-lg transition-colors duration-[2500ms] ${fadeToBlack ? 'text-white' : 'text-black'}`}>
              Your personal career coach, powered by AI, to help you land your dream job faster.
            </p>
            <button
              onClick={handleGetStarted}
              className="font-bold py-8 px-24 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 text-3xl transform hover:-translate-y-1 fade-up-late"
              style={{ backgroundColor: 'white', color: 'black' }}
            >
              Get Started Now
            </button>
          </div>
        </section>

        {/* WHAT YOU CAN ACCOMPLISH */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
          <div
            id="accomplish"
            data-animate
            className={`max-w-4xl transition-all duration-1000 ${visibleSections.has('accomplish') ? 'slide-in-left' : 'opacity-0'
              }`}
          >
            <h2 className={`text-6xl md:text-7xl font-bold mb-12 drop-shadow-lg transition-colors duration-[2500ms] ${fadeToBlack ? 'text-white' : 'text-white'}`}>
              What You Can Accomplish
            </h2>
            <p className={`text-2xl md:text-3xl leading-relaxed drop-shadow-md transition-colors duration-[2500ms] ${fadeToBlack ? 'text-white' : 'text-white'}`}>
              Build a professional, keyword-optimized resume from scratch, practice realistic mock interviews to train your body and tone,
              search for jobs with real-time suggestions, and receive instant feedback to improve your performance — all in one place.            </p>
          </div>
        </section>

        {/* OPPORTUNITY SECTION */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
          <div
            id="opportunity"
            data-animate
            className={`max-w-4xl transition-all duration-1000 ${visibleSections.has('opportunity') ? 'fade-in' : 'opacity-0'
              }`}
          >
            <h2 className={`text-6xl md:text-7xl font-bold mb-12 drop-shadow-lg transition-colors duration-[2500ms] ${fadeToBlack ? 'text-white' : 'text-white'}`}>
              The Opportunity We Provide
            </h2>

            <div
              className={`text-2xl md:text-3xl leading-relaxed drop-shadow-md word-by-word transition-colors duration-[2500ms] ${visibleSections.has('opportunity') ? '' : 'hidden'
                } ${fadeToBlack ? 'text-white' : 'text-white'}`}
            >
              {visibleSections.has('opportunity') &&
                'Gain a competitive edge in the job market. Our tools give you the confidence and preparation needed to impress recruiters and hiring managers, turning interviews into job offers.'
                  .split('  ')
                  .map((word, i) => (
                    <span key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                      {word}{'  '}
                    </span>
                  ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
          <div
            id="how-it-works"
            data-animate
            className={`max-w-4xl transition-all duration-1000`}
          >
            <h2 className={`text-6xl md:text-7xl font-bold mb-12 drop-shadow-lg text-center transition-colors duration-[2500ms] ${visibleSections.has('how-it-works') ? 'fade-up' : 'opacity-0'
              } ${fadeToBlack ? 'text-white' : 'text-white'}`}>
              How It Works
            </h2>
            <ul className={`text-xl md:text-2xl space-y-8 drop-shadow-md transition-colors duration-[2500ms] ${fadeToBlack ? 'text-white' : 'text-white'}`}>
              <li className={`flex items-start list-item ${visibleSections.has('how-it-works') ? 'list-item-1' : ''}`}>
                <span className="text-4xl font-bold mr-6">1.</span>
                <span>Create your account in seconds.</span>
              </li>
              <li className={`flex items-start list-item ${visibleSections.has('how-it-works') ? 'list-item-2' : ''}`}>
                <span className="text-4xl font-bold mr-6">2.</span>
                <span>Search a job and extract it's description/requirements.</span>
              </li>
              <li className={`flex items-start list-item ${visibleSections.has('how-it-works') ? 'list-item-3' : ''}`}>
                <span className="text-4xl font-bold mr-6">3.</span>
                <span>Use intelligent builder to craft your resume with detailed AI-powered feedback.</span>
              </li>
              <li className={`flex items-start list-item ${visibleSections.has('how-it-works') ? 'list-item-4' : ''}`}>
                <span className="text-4xl font-bold mr-6">4.</span>
                <span>Set up an AI mock Interview.</span>
              </li>
              <li className={`flex items-start list-item ${visibleSections.has('how-it-works') ? 'list-item-5' : ''}`}>
                <span className="text-4xl font-bold mr-6">5.</span>
                <span>Practice and improve your confidence.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* CREATORS SECTION */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
          <div
            id="creators"
            data-animate
            className={`max-w-5xl w-full transition-all duration-1000 ${visibleSections.has('creators') ? 'fade-in' : 'opacity-0'
              }`}
          >
            <h2 className={`text-6xl md:text-7xl font-bold mb-20 drop-shadow-lg text-center transition-colors duration-[2500ms] ${fadeToBlack ? 'text-white' : 'text-white'}`}>
              Meet the Creators
            </h2>

            {/* Creator 1 */}
            <div className="flex flex-col md:flex-row items-center gap-12 mb-16">
              <div className={`flex-1 transition-colors duration-[2500ms] ${fadeToBlack ? 'text-white' : 'text-white'}`}>
                <h3 className="text-4xl font-bold mb-3">Gaurav Tadia</h3>
                <p className="text-xl mb-4 opacity-90">Lead AI Engineer</p>
                <p className="text-lg md:text-xl opacity-90">
                  created the landing page, the user to-do list, and multiple Resume Builder features, including document upload, PDF editing, templates, and a rich-text toolbar. He also refined the sharing functionality and header design, and developed the “My Resume” section for both draft and completed versions.
                </p>
              </div>
            </div>

            {/* Creator 2: Minliang */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12 mb-16 text-right md:text-right">
              <div className={`flex-1 transition-colors duration-[2500ms] ${fadeToBlack ? 'text-white' : 'text-white'}`}>
                <h3 className="text-4xl font-bold mb-3">Minliang Xu</h3>
                <p className="text-xl mb-4 opacity-90">Head of Product UI Design</p>
                <p className="text-lg md:text-xl opacity-90">
                  Designed the UI for the Login, Sign Up, Dashboard, Mock Interview, Schedule Interview, and Job Search pages. He also built consistent functional headers and connected all major pages to ensure smooth navigation. In addition, he assisted with dashboard functionality and the Schedule Interview workflow to improve overall usability.
                </p>
              </div>
            </div>

            {/* Creator 3: Rebecca */}
            <div className="flex flex-col md:flex-row items-center gap-12 mb-16">
              <div className={`flex-1 transition-colors duration-[2500ms] ${fadeToBlack ? 'text-white' : 'text-white'}`}>
                <h3 className="text-4xl font-bold mb-3">Rebecca Moses</h3>
                <p className="text-xl mb-4 opacity-90">Full Stack Developer</p>
                <p className="text-lg md:text-xl opacity-90">
                  developed the Job Search page, implementing key features such as keyword extraction, skill-gap analysis, and job preference saving/deleting. She integrated resume data, synced real-time updates from the backend, and connected Job Search results to the Dashboard to display ATS score updates, keyword matches, and job-role insights.
                </p>
              </div>
            </div>

            {/* Creator 4: Matthew */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12 text-right md:text-right">
              <div className={`flex-1 transition-colors duration-[2500ms] ${fadeToBlack ? 'text-white' : 'text-white'}`}>
                <h3 className="text-4xl font-bold mb-3">Matthew Aitken</h3>
                <p className="text-xl mb-4 opacity-90">Leader and Fullstack Engineer</p>
                <p className="text-lg md:text-xl opacity-90">
                  Built the authentication service for user login and registration. He created the initial version of the resume builder, added AI-powered enhancements, fixed bugs, and supported development of the Mock Interview system, helping power some of the app’s core intelligent features.
                </p>
              </div>
            </div>

          </div>
        </section>

        <div className="h-32"></div>
        {/* FINAL CTA SECTION */}
        <section className="flex flex-col items-center justify-center px-6 py-20">
          <div className="text-center">
            <button
              onClick={handleBottomGetStarted}
              className="font-bold py-8 px-24 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 text-3xl transform hover:-translate-y-1"
              style={{ backgroundColor: 'white', color: 'black' }}
            >
              Get Started Now
            </button>
          </div>
        </section>

        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default LandingPage;