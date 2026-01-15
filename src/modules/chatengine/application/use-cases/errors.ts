export class DomainError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export class InvalidPayloadError extends DomainError {
  constructor(message = 'Payload inválido') {
    super('INVALID_PAYLOAD', message)
  }
}

export class InvalidRequestError extends DomainError {
  constructor(message = 'Requisição inválida') {
    super('INVALID_REQUEST', message)
  }
}

export class DuplicateMessageError extends DomainError {
  constructor(message = 'Mensagem duplicada') {
    super('DUPLICATE_MESSAGE', message)
  }
}

export class MessageNotFoundError extends DomainError {
  constructor(message = 'Mensagem não encontrada') {
    super('MESSAGE_NOT_FOUND', message)
  }
}

export class ConversationNotFoundError extends DomainError {
  constructor(message = 'Conversa não encontrada') {
    super('CONVERSATION_NOT_FOUND', message)
  }
}
