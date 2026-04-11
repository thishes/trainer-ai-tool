import { io } from 'socket.io-client'

let socket = null

export function useSocket() {
  if (!socket) {
    const wsUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port || (window.location.protocol === 'https:' ? '443' : '80')}`
    socket = io(wsUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
