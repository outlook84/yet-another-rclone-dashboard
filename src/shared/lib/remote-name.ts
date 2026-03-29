const REMOTE_NAME_PATTERN = /^[\p{L}\p{N}_.+@]+(?:[ -]+[\p{L}\p{N}_.+@-]+)*$/u

function isValidRemoteName(name: string) {
  return REMOTE_NAME_PATTERN.test(name)
}

export { isValidRemoteName }
