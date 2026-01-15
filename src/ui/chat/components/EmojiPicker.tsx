/**
 * EmojiPicker Component
 * 
 * Seletor de emojis completo usando emoji-mart
 * Popover maior com busca, categorias e scroll
 */

'use client'

import { useEffect, useRef } from 'react'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  isOpen: boolean
  onClose: () => void
}

export function EmojiPicker({ onEmojiSelect, isOpen, onClose }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null)

  // Fecha o picker ao clicar fora
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    // Adiciona listener após um pequeno delay para evitar fechar imediatamente
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full mb-2 right-0 z-50 rounded-xl shadow-lg border border-gray-200 overflow-hidden bg-white"
      style={{ width: '360px', height: '420px' }}
    >
      <Picker
        data={data}
        onEmojiSelect={(emoji: { native: string }) => {
          onEmojiSelect(emoji.native)
          // Não fecha automaticamente - o usuário pode selecionar múltiplos emojis
        }}
        theme="light"
        locale="pt"
        previewPosition="none"
        skinTonePosition="none"
      />
    </div>
  )
}
