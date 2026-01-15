/**
 * MessageInput Component
 * 
 * Input para enviar mensagens (inspirado no WhatsApp Web)
 * Suporta reply, emoji picker, envio via Enter e upload de mídia
 * 
 * Conectado ao store via sendMessageOptimistic
 * Nenhuma lógica de envio no componente
 * 
 * FLUXO DE UPLOAD DE MÍDIA:
 * 1. Usuário seleciona arquivo
 * 2. Exibir preview (imagem, vídeo, áudio ou arquivo)
 * 3. Upload via chatApi.uploadAttachment (ao enviar)
 * 4. Receber URL
 * 5. Criar mensagem com attachment
 * 6. Envio otimista com status pending
 */

'use client'

import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { useChatStore } from '../store/chatStore'
import { ReplyPreview } from './ReplyPreview'
import { EmojiPicker } from './EmojiPicker'
import * as chatApi from '../api/chatApi'
import { Attachment } from '@/modules/chatengine/domain/Attachment'
import { MessageType } from '@/modules/chatengine/domain/Message'
import { useAudioRecorder } from '../hooks/useAudioRecorder'

interface MessageInputProps {
  conversationId: string | null
}

interface AttachmentPreview {
  file: File
  type: Attachment['type']
  url: string
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [attachmentPreview, setAttachmentPreview] = useState<AttachmentPreview | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const { replyToMessage, setReplyToMessage, sendMessageOptimistic, sendingMessageIds } = useChatStore()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioPreviewRef = useRef<HTMLAudioElement>(null)

  // Hook de gravação de áudio
  const {
    isRecording,
    recordingTime,
    audioBlob,
    error: audioError,
    permissionDenied,
    startRecording,
    stopRecording,
    cancelRecording,
    retryPermission,
  } = useAudioRecorder()

  // Verifica se está enviando alguma mensagem
  const isSending = sendingMessageIds.length > 0 || isUploading

  // Quando a gravação para, cria preview do áudio
  useEffect(() => {
    if (audioBlob && !isRecording) {
      const url = URL.createObjectURL(audioBlob)
      const fileName = `audio_${Date.now()}.webm`
      const file = new File([audioBlob], fileName, { type: audioBlob.type })

      setAttachmentPreview({
        file,
        type: 'audio',
        url,
      })
    }
  }, [audioBlob, isRecording])

  // Determina tipo de anexo baseado no MIME type
  const getAttachmentType = (file: File): Attachment['type'] => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type.startsWith('audio/')) return 'audio'
    return 'file'
  }

  // Determina tipo de mensagem baseado no tipo de anexo
  const getMessageType = (attachmentType: Attachment['type']): MessageType => {
    return attachmentType === 'file' ? 'text' : attachmentType
  }

  // Handler para seleção de arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const attachmentType = getAttachmentType(file)
    const url = URL.createObjectURL(file)

    // Cria preview (NÃO faz upload ainda)
    setAttachmentPreview({
      file,
      type: attachmentType,
      url,
    })

    // Limpa input de arquivo
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handler para cancelar preview
  const handleCancelPreview = () => {
    if (attachmentPreview?.url) {
      URL.revokeObjectURL(attachmentPreview.url)
    }
    setAttachmentPreview(null)
  }

  const handleSend = async () => {
    // Verifica se tem conteúdo ou attachment
    const hasContent = inputValue.trim().length > 0
    const hasPreview = attachmentPreview !== null

    if ((!hasContent && !hasPreview) || !conversationId || isSending) return

    const messageContent = inputValue.trim()
    const replyToId = replyToMessage?.id
    let attachments: Attachment[] | undefined = undefined
    let messageType: MessageType = 'text'

    // Se tem preview, faz upload primeiro
    if (attachmentPreview) {
      setIsUploading(true)

      try {
        // 3. Upload via chatApi.uploadAttachment
        const attachment = await chatApi.uploadAttachment(attachmentPreview.file)

        // 4. Receber URL (já está no attachment)
        attachments = [attachment]
        messageType = getMessageType(attachment.type)

        // Limpa preview após upload
        if (attachmentPreview.url) {
          URL.revokeObjectURL(attachmentPreview.url)
        }
        setAttachmentPreview(null)
      } catch (error) {
        console.error('Erro ao fazer upload:', error)
        setIsUploading(false)
        alert('Erro ao fazer upload do arquivo. Tente novamente.')
        return
      } finally {
        setIsUploading(false)
      }
    }

    try {
      // 5. Criar mensagem com attachment
      // 6. Envio otimista com status pending
      await sendMessageOptimistic({
        conversationId,
        type: messageType,
        content: messageContent || (attachments ? '' : ''),
        replyToMessageId: replyToId,
        attachments,
      })

      // Limpa tudo após envio
      setInputValue('')
      setReplyToMessage(null)

      // Foca no input novamente
      inputRef.current?.focus()
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      // Erro já é tratado no store (status failed)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    const textarea = inputRef.current
    if (!textarea) {
      setInputValue((prev) => prev + emoji)
      return
    }

    // Insere emoji na posição do cursor
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const textBefore = inputValue.substring(0, start)
    const textAfter = inputValue.substring(end)
    const newValue = textBefore + emoji + textAfter

    setInputValue(newValue)

    // Restaura posição do cursor após o emoji
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + emoji.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)

      // Trigger resize
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }, 0)
  }

  // Formata tempo de gravação (mm:ss)
  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handler para iniciar gravação
  const handleStartRecording = async () => {
    // Cancela preview de anexo se existir
    if (attachmentPreview) {
      handleCancelPreview()
    }
    await startRecording()
  }

  // Handler para cancelar gravação de áudio
  const handleCancelAudioRecording = () => {
    cancelRecording()
    if (attachmentPreview?.type === 'audio') {
      handleCancelPreview()
    }
  }

  // Handler para enviar áudio gravado
  const handleSendAudio = async () => {
    if (!audioBlob || !conversationId || isSending) return

    // O áudio já está em attachmentPreview (via useEffect)
    if (attachmentPreview?.type === 'audio') {
      await handleSend()
    }
  }

  if (!conversationId) {
    return null
  }

  return (
    <div className="bg-white border-t border-gray-200">
      <ReplyPreview />

      {/* Preview de anexo (ANTES do envio) */}
      {attachmentPreview && (
        <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100">
          <div className="flex items-start gap-3">
            {attachmentPreview.type === 'image' && (
              <img
                src={attachmentPreview.url}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-xl border border-gray-200 shadow-sm"
              />
            )}
            {attachmentPreview.type === 'video' && (
              <video
                src={attachmentPreview.url}
                className="w-20 h-20 object-cover rounded-xl border border-gray-200 shadow-sm"
                controls={false}
              />
            )}
            {attachmentPreview.type === 'audio' && (
              <div className="flex-1 min-w-0">
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                  <audio ref={audioPreviewRef} src={attachmentPreview.url} controls className="w-full h-8" />
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {(attachmentPreview.file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            )}
            {attachmentPreview.type === 'file' && (
              <div className="w-20 h-20 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center shadow-sm">
                <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
            {attachmentPreview.type !== 'audio' && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {attachmentPreview.file.name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {(attachmentPreview.file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            )}
            <button
              onClick={handleCancelPreview}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
              aria-label="Remover anexo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* UI de gravação */}
      {isRecording && (
        <div className="px-5 py-3 bg-red-50/80 border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 flex-1">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-red-700">Gravando</span>
              <span className="text-sm text-red-600 font-mono font-medium">{formatRecordingTime(recordingTime)}</span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors shadow-sm"
              aria-label="Parar gravação"
            >
              Parar
            </button>
            <button
              type="button"
              onClick={handleCancelAudioRecording}
              className="px-4 py-2 bg-white text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
              aria-label="Cancelar gravação"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Erro de permissão */}
      {audioError && permissionDenied && (
        <div className="px-5 py-3 bg-yellow-50/80 border-b border-yellow-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">{audioError}</p>
              <p className="text-xs text-yellow-600 mt-1">Permita o acesso ao microfone nas configurações do navegador.</p>
            </div>
            <button
              type="button"
              onClick={retryPermission}
              className="px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-600 transition-colors ml-3 shadow-sm"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-3 flex items-end gap-2 relative">
        {/* Input de arquivo (oculto) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,*/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Botão de anexo */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isRecording}
          className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2.5 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Anexar arquivo"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>

        {/* Botão de microfone */}
        {!isRecording && (
          <button
            type="button"
            onClick={handleStartRecording}
            disabled={isSending}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2.5 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Gravar áudio"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
          disabled={isRecording}
          className="text-xl hover:bg-gray-100 rounded-full p-2.5 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Abrir emoji picker"
        >
          😊
        </button>

        {/* Emoji Picker */}
        <EmojiPicker
          isOpen={isEmojiPickerOpen}
          onClose={() => setIsEmojiPickerOpen(false)}
          onEmojiSelect={handleEmojiSelect}
        />

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? 'Gravando áudio...' : 'Digite uma mensagem'}
            rows={1}
            disabled={isRecording}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 overflow-hidden disabled:bg-gray-50 disabled:cursor-not-allowed text-sm leading-relaxed bg-gray-50"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={(!inputValue.trim() && !attachmentPreview) || isSending}
          className="bg-[#0ea5e9] text-white rounded-full p-2.5 hover:bg-[#0284c7] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0 shadow-sm"
          aria-label="Enviar mensagem"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

