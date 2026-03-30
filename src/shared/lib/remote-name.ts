const REMOTE_NAME_HEAD_CHAR = /^[\p{L}\p{N}_.+@]$/u
const REMOTE_NAME_TAIL_CHAR = /^[\p{L}\p{N}_.+@-]$/u

function isRemoteNameHeadChar(char: string) {
  return REMOTE_NAME_HEAD_CHAR.test(char)
}

function isRemoteNameTailChar(char: string) {
  return REMOTE_NAME_TAIL_CHAR.test(char)
}

function isRemoteNameSeparator(char: string) {
  return char === ' ' || char === '-'
}

function isValidRemoteName(name: string) {
  if (name.length === 0) {
    return false
  }

  let isInHeadState = false
  let isInSeparatorState = false
  let isInTailState = false

  for (const char of name) {
    const matchesHeadChar = isRemoteNameHeadChar(char)
    const matchesTailChar = isRemoteNameTailChar(char)
    const matchesSeparator = isRemoteNameSeparator(char)

    const nextInHead: boolean = matchesHeadChar && isInHeadState
    const nextInSeparator: boolean =
      matchesSeparator && (isInHeadState || isInSeparatorState || isInTailState)
    const nextInTail: boolean = matchesTailChar && (isInSeparatorState || isInTailState)

    if (!isInHeadState && !isInSeparatorState && !isInTailState) {
      if (!matchesHeadChar) {
        return false
      }

      isInHeadState = true
      continue
    }

    if (!nextInHead && !nextInSeparator && !nextInTail) {
      return false
    }

    isInHeadState = nextInHead
    isInSeparatorState = nextInSeparator
    isInTailState = nextInTail
  }

  return isInHeadState || isInTailState
}

export { isValidRemoteName }
