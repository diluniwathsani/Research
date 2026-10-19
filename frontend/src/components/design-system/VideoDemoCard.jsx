import React, { useState } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  Clock,
  Layers,
  ExternalLink,
  CheckCircle2,
  Share2
} from 'lucide-react';

export default function VideoDemoCard({
  title = 'Sprint 1 Demo: Foundational Architecture & Core Work Orders',
  recordedBy = 'Kasun Perera (Lead Architect)',
  duration = '04:42',
  date = 'Oct 18, 2026',
  posterSrc = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
  chapters = [
    { time: '00:00', title: 'Context & MVP Requirements' },
    { time: '01:15', title: 'Domain-Weighted Subtask Decomposition' },
    { time: '02:40', title: 'SciPy HiGHS ILP Precedence Constraints' },
    { time: '03:55', title: 'CPM Bottleneck Early Warning Alerts' }
  ],
  relatedTickets = ['US001', 'US008', 'US013']
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);

  return (
    <section
      aria-label={title}
      className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/95 backdrop-blur-md shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/95"
    >
      <div className="relative aspect-video max-h-[380px] w-full overflow-hidden bg-zinc-950">
        <img
          src={posterSrc}
          alt={`Demo thumbnail for ${title}`}
          className="h-full w-full object-cover opacity-80 transition-opacity hover:opacity-90"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-zinc-950/20" />

        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? 'Pause demo playback' : 'Play demo playback'}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-zinc-950 shadow-2xl backdrop-blur-md transition-all duration-150 hover:scale-105 hover:bg-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none active:scale-[0.96] dark:bg-zinc-100 dark:text-zinc-900"
          >
            {isPlaying ? (
              <Pause className="h-7 w-7" strokeWidth={2} />
            ) : (
              <Play className="ml-1 h-7 w-7" strokeWidth={2} />
            )}
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4 text-white">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-md bg-zinc-900/80 px-2 py-1 text-xs font-semibold backdrop-blur-md">
              <Clock className="h-3.5 w-3.5 text-zinc-300" strokeWidth={1.75} />
              {duration}
            </span>
            <span className="text-xs font-medium text-zinc-300">
              Chapter: {chapters[activeChapter]?.title}
            </span>
          </div>

          <span className="rounded-md bg-rose-600/90 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
            Recorded Demo
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              {title}
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Recorded by <span className="font-semibold text-zinc-700 dark:text-zinc-300">{recordedBy}</span> on {date}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Referenced:
            </span>
            {relatedTickets.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-200/90 bg-zinc-50 px-2 py-0.5 font-mono text-xs font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
            Interactive Video Markers
          </span>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {chapters.map((ch, idx) => (
              <button
                key={ch.time}
                type="button"
                onClick={() => setActiveChapter(idx)}
                className={`flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none active:scale-[0.98] dark:focus-visible:ring-zinc-100 ${
                  activeChapter === idx
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="font-mono font-bold opacity-80">{ch.time}</span>
                <span className="truncate">{ch.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
