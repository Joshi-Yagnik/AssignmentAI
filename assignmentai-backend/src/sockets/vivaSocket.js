module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a specific viva session room
    socket.on('join_viva', (data) => {
      const { sessionId } = data;
      socket.join(sessionId);
      console.log(`Socket ${socket.id} joined viva session ${sessionId}`);
    });

    // Receive live transcript updates
    socket.on('viva_transcript_update', (data) => {
      // For live monitoring by a teacher if they join the same room
      io.to(data.sessionId).emit('teacher_transcript_live', data);
    });

    // Receive security warnings
    socket.on('viva_warning', (data) => {
      console.log(`Viva Warning for ${data.sessionId}: ${data.type}`);
      io.to(data.sessionId).emit('teacher_viva_warning', data);
    });

    // Complete session
    socket.on('end_viva', (data) => {
      console.log(`Viva session ended: ${data.sessionId}`);
      io.to(data.sessionId).emit('teacher_viva_ended', data);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};
