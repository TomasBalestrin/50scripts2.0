'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer({ audioUrl, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolume, setShowVolume] = useState(false);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audio.volume = volume;
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Erro ao reproduzir audio:', err);
      }
    }
  }, [isPlaying]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;

    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = fraction * duration;
    setCurrentTime(audio.currentTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-xl border border-[#1A3050] bg-[#1A3050] p-4">
      {/* Title */}
      {title && (
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">
          {title}
        </p>
      )}

      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={isLoading && !isPlaying}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
            'bg-[#C9A84C] text-white hover:bg-[#d63d56]',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isLoading && !isPlaying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" />
          )}
        </button>

        {/* Progress area */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {/* Progress bar */}
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="group relative h-2 w-full cursor-pointer rounded-full bg-[#0F1D32]"
          >
            {/* Filled portion */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-[#C9A84C] transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-[#C9A84C] bg-white opacity-0 transition-opacity group-hover:opacity-100"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>

          {/* Time display */}
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume control */}
        <div
          className="relative flex shrink-0 items-center"
          onMouseEnter={() => setShowVolume(true)}
          onMouseLeave={() => setShowVolume(false)}
        >
          <button
            type="button"
            onClick={toggleMute}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-white"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>

          {/* Volume slider (appears on hover) */}
          {showVolume && (
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border border-[#363660] bg-[#0F1D32] px-3 py-2 shadow-lg">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-[#363660]
                  [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-[#C9A84C]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
