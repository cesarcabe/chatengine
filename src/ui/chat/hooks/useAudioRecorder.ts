/**
 * useAudioRecorder Hook
 * 
 * Hook customizado para gerenciar gravação de áudio usando MediaRecorder API
 * Retorna estado e funções para controlar a gravação
 */

import { useState, useRef, useCallback } from 'react'

export interface AudioRecorderState {
  isRecording: boolean
  isPaused: boolean
  recordingTime: number // em segundos
  audioBlob: Blob | null
  error: string | null
  permissionDenied: boolean
}

export interface AudioRecorderControls {
  startRecording: () => Promise<void>
  stopRecording: () => void
  cancelRecording: () => void
  retryPermission: () => void
}

export function useAudioRecorder(): AudioRecorderState & AudioRecorderControls {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Limpa recursos (streams e timers)
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setPermissionDenied(false)
      chunksRef.current = []

      // Solicita permissão de microfone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Determina o melhor codec disponível
      let mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/ogg'
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4'
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '' // usa o padrão do navegador
      }

      // Cria MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
      })

      mediaRecorderRef.current = mediaRecorder

      // Handler para quando dados estão disponíveis
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // Handler para quando gravação termina
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        setAudioBlob(blob)
        cleanup()
      }

      // Handler para erros
      mediaRecorder.onerror = (event) => {
        console.error('Erro na gravação:', event)
        setError('Erro ao gravar áudio')
        cleanup()
        setIsRecording(false)
      }

      // Inicia gravação
      mediaRecorder.start(100) // coleta dados a cada 100ms

      setIsRecording(true)
      setRecordingTime(0)

      // Inicia timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Erro ao iniciar gravação:', err)
      cleanup()

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionDenied(true)
          setError('Permissão de microfone negada')
        } else if (err.name === 'NotFoundError') {
          setError('Microfone não encontrado')
        } else {
          setError('Erro ao acessar microfone')
        }
      } else {
        setError('Erro ao iniciar gravação')
      }
    }
  }, [cleanup])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRecording])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }

    cleanup()
    setIsRecording(false)
    setIsPaused(false)
    setRecordingTime(0)
    setAudioBlob(null)
    chunksRef.current = []
  }, [isRecording, cleanup])

  const retryPermission = useCallback(() => {
    setError(null)
    setPermissionDenied(false)
  }, [])

  return {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    error,
    permissionDenied,
    startRecording,
    stopRecording,
    cancelRecording,
    retryPermission,
  }
}
