/**
 * AudioMessage Component
 * 
 * Renderiza mensagem de áudio estilo WhatsApp Web
 * Player customizado com botão play/pause, waveform fake e timer
 */

'use client'

import { useState, useEffect, useRef } from 'react'

interface AudioMessageProps {
  src: string
  isOwn?: boolean
  senderName?: string
}

export function AudioMessage({ src, isOwn = false, senderName }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Gera waveform fake (barras com alturas variáveis) - sempre mesma para consistência visual
  const generateWaveform = () => {
    const bars = 50
    // Alturas variadas para visual mais realista
    const heights = Array.from({ length: bars }, (_, i) => {
      const baseHeight = 30 + Math.sin(i / 5) * 15 + Math.cos(i / 3) * 10
      return Math.max(15, Math.min(75, baseHeight))
    })
    return heights
  }

  const [waveform] = useState(generateWaveform())

  // Atualiza currentTime quando áudio toca
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => {
      if (audio.duration) {
        setDuration(audio.duration)
      }
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('durationchange', updateDuration)
    audio.addEventListener('ended', () => {
      setIsPlaying(false)
      setCurrentTime(0)
    })

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('durationchange', updateDuration)
    }
  }, [src])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().catch((error) => {
        console.error('Erro ao reproduzir áudio:', error)
      })
      setIsPlaying(true)
    }
  }

  // Formata tempo (mm:ss)
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calcula progresso (0-1)
  const progress = duration > 0 ? currentTime / duration : 0
  const playedBars = Math.floor(waveform.length * progress)

  return (
    <div className="flex items-center gap-3 py-0.5">
      {/* Elemento de áudio invisível */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Botão Play/Pause */}
      <button
        onClick={togglePlayPause}
        className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all ${
          isOwn
            ? 'bg-white/25 hover:bg-white/35 text-white shadow-sm'
            : 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm'
        } active:scale-95`}
        aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        )}
      </button>

      {/* Waveform e Timer */}
      <div className="flex-1 min-w-0">
        {/* Waveform */}
        <div className="flex items-end gap-[2px] h-10 mb-1.5">
          {waveform.map((height, index) => (
            <div
              key={index}
              className={`flex-1 rounded-sm transition-colors duration-150 ${
                index < playedBars
                  ? isOwn
                    ? 'bg-white/70'
                    : 'bg-blue-500'
                  : isOwn
                  ? 'bg-white/40'
                  : 'bg-blue-300'
              }`}
              style={{ height: `${height}%`, minHeight: '4px' }}
            />
          ))}
        </div>

        {/* Timer */}
        <div className={`text-xs font-mono ${
          isOwn ? 'text-white/90' : 'text-gray-600'
        }`}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Avatar (apenas para mensagens recebidas) */}
      {!isOwn && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm">
          <span className="text-white text-[11px] font-medium">
            {senderName?.[0]?.toUpperCase() || '?'}
          </span>
        </div>
      )}
    </div>
  )
}
