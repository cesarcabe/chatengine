import { Conversation } from '../../domain/Conversation'
import { Message } from '../../domain/Message'
import type { InMemoryStorage } from './storage'

export function initializeMockData(storage: InMemoryStorage) {
  const mockWorkspaceId = 'dev-workspace'
  const workspaceConversations = storage.getWorkspaceConversations(mockWorkspaceId)
  const workspaceMessages = storage.getWorkspaceMessages(mockWorkspaceId)

  const conv1: Conversation = {
    id: '1',
    workspaceId: mockWorkspaceId,
    channel: 'whatsapp',
    participants: [
      { id: 'user1', name: 'João Silva', avatar: undefined },
      { id: 'me', name: 'Eu', avatar: undefined },
    ],
    lastMessage: {
      id: 'msg1-3',
      content: 'Olá, como vai?',
      senderId: 'user1',
      createdAt: new Date(Date.now() - 3600000),
    },
    updatedAt: new Date(Date.now() - 3600000),
  }

  const conv2: Conversation = {
    id: '2',
    workspaceId: mockWorkspaceId,
    channel: 'whatsapp',
    participants: [
      { id: 'user2', name: 'Maria Santos', avatar: undefined },
      { id: 'me', name: 'Eu', avatar: undefined },
    ],
    lastMessage: {
      id: 'msg2-3',
      content: 'Tudo certo por aqui!',
      senderId: 'me',
      createdAt: new Date(Date.now() - 7200000),
    },
    updatedAt: new Date(Date.now() - 7200000),
  }

  workspaceConversations.set('1', conv1)
  workspaceConversations.set('2', conv2)

  const msgs1: Message[] = [
    {
      id: 'msg1-1',
      workspaceId: mockWorkspaceId,
      conversationId: '1',
      senderId: 'user1',
      type: 'text',
      content: 'Olá!',
      status: 'read',
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      id: 'msg1-2',
      workspaceId: mockWorkspaceId,
      conversationId: '1',
      senderId: 'me',
      type: 'text',
      content: 'Oi, tudo bem?',
      status: 'read',
      createdAt: new Date(Date.now() - 3300000),
    },
    {
      id: 'msg1-3',
      workspaceId: mockWorkspaceId,
      conversationId: '1',
      senderId: 'user1',
      type: 'text',
      content: 'Olá, como vai?',
      status: 'read',
      createdAt: new Date(Date.now() - 3600000),
    },
  ]

  const msgs2: Message[] = [
    {
      id: 'msg2-1',
      workspaceId: mockWorkspaceId,
      conversationId: '2',
      senderId: 'me',
      type: 'text',
      content: 'Oi Maria!',
      status: 'delivered',
      createdAt: new Date(Date.now() - 7200000),
    },
    {
      id: 'msg2-2',
      workspaceId: mockWorkspaceId,
      conversationId: '2',
      senderId: 'user2',
      type: 'text',
      content: 'Oi! Tudo bem?',
      status: 'read',
      createdAt: new Date(Date.now() - 6900000),
    },
    {
      id: 'msg2-3',
      workspaceId: mockWorkspaceId,
      conversationId: '2',
      senderId: 'me',
      type: 'text',
      content: 'Tudo certo por aqui!',
      status: 'delivered',
      createdAt: new Date(Date.now() - 7200000),
    },
  ]

  workspaceMessages.set('1', msgs1)
  workspaceMessages.set('2', msgs2)
}
