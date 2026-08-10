export const TIMER_STATUS = {
  IDLE: 'idle',
  HOLDING: 'holding',
  READY: 'ready',
  RUNNING: 'running',
  STOPPED: 'stopped',
}

export const TIMER_COMMAND = {
  PRESS: 'PRESS',
  RELEASE: 'RELEASE',
  HOLD_READY: 'HOLD_READY',
  TICK: 'TICK',
  CANCEL: 'CANCEL',
  RESET: 'RESET',
  RESTORE_STOPPED: 'RESTORE_STOPPED',
}

export function createInitialTimerState() {
  return {
    status: TIMER_STATUS.IDLE,
    displayTime: 0,
    finalTime: null,
    startTime: null,
    inputMethod: null,
  }
}

export function canonicalizeElapsedTime(elapsedTime) {
  if (!Number.isFinite(elapsedTime)) {
    return 1
  }

  return Math.max(1, Math.round(Math.max(0, elapsedTime)))
}

export function timerReducer(state, command) {
  switch (command.type) {
    case TIMER_COMMAND.PRESS:
      if (state.status === TIMER_STATUS.IDLE) {
        return {
          ...state,
          status: TIMER_STATUS.HOLDING,
          inputMethod: command.inputMethod,
        }
      }

      if (state.status === TIMER_STATUS.RUNNING && state.startTime != null) {
        const finalTime = canonicalizeElapsedTime(command.now - state.startTime)

        return {
          ...state,
          status: TIMER_STATUS.STOPPED,
          displayTime: finalTime,
          finalTime,
          startTime: null,
        }
      }

      return state

    case TIMER_COMMAND.HOLD_READY:
      return state.status === TIMER_STATUS.HOLDING
        ? { ...state, status: TIMER_STATUS.READY }
        : state

    case TIMER_COMMAND.RELEASE:
      if (state.status === TIMER_STATUS.HOLDING) {
        return createInitialTimerState()
      }

      if (state.status === TIMER_STATUS.READY) {
        return {
          ...state,
          status: TIMER_STATUS.RUNNING,
          displayTime: 0,
          finalTime: null,
          startTime: command.now,
        }
      }

      return state

    case TIMER_COMMAND.TICK:
      if (state.status !== TIMER_STATUS.RUNNING || state.startTime == null || !Number.isFinite(command.now)) {
        return state
      }

      return {
        ...state,
        displayTime: Math.max(0, command.now - state.startTime),
      }

    case TIMER_COMMAND.CANCEL:
      return state.status === TIMER_STATUS.HOLDING || state.status === TIMER_STATUS.READY
        ? createInitialTimerState()
        : state

    case TIMER_COMMAND.RESET:
      return createInitialTimerState()

    case TIMER_COMMAND.RESTORE_STOPPED:
      if (!Number.isSafeInteger(command.timeMs) || command.timeMs < 1) {
        return state
      }

      return {
        status: TIMER_STATUS.STOPPED,
        displayTime: command.timeMs,
        finalTime: command.timeMs,
        startTime: null,
        inputMethod: command.inputMethod,
      }

    default:
      return state
  }
}
