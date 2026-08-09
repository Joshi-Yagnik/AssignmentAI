module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a specific viva session room
    // data: { sessionId, studentName? (optional identity for teacher monitor) }
    socket.on('join_viva', (data) => {
      const { sessionId, studentName, role } = data;
      socket.join(sessionId);
      console.log(`Socket ${socket.id} joined viva session ${sessionId}`);

      // Notify teacher monitor that a student has connected
      if (role === 'student') {
        io.to(sessionId).emit('student_joined', {
          socketId: socket.id,
          studentName: studentName || `Student (${socket.id.slice(0, 6)})`,
          sessionId,
          joinedAt: new Date(),
        });
      }
    });

    // Receive live transcript updates — student sends identity so teacher can map them
    socket.on('viva_transcript_update', (data) => {
      // data: { sessionId, transcript, socketId, studentName }
      io.to(data.sessionId).emit('teacher_transcript_live', {
        ...data,
        socketId: data.socketId || socket.id,
        studentId: data.studentId || null,
        studentName: data.studentName || `Student (${socket.id.slice(0, 6)})`,
      });
    });

    // Receive live draft updates as the student is typing/speaking
    socket.on('viva_transcript_live_draft', (data) => {
      io.to(data.sessionId).emit('teacher_transcript_live_draft', {
        ...data,
        socketId: data.socketId || socket.id,
        studentId: data.studentId || null,
        studentName: data.studentName || `Student (${socket.id.slice(0, 6)})`,
      });
    });

    // Receive security warnings — include student identity
    socket.on('viva_warning', (data) => {
      console.log(`Viva Warning for ${data.sessionId}: ${data.type}`);
      io.to(data.sessionId).emit('teacher_viva_warning', {
        ...data,
        socketId: data.socketId || socket.id,
        studentId: data.studentId || null,
        studentName: data.studentName || `Student (${socket.id.slice(0, 6)})`,
      });
    });

    // Complete session — student or teacher ends it
    socket.on('end_viva', (data) => {
      console.log(`Viva session ended: ${data.sessionId}`);
      io.to(data.sessionId).emit('teacher_viva_ended', {
        ...data,
        socketId: data.socketId || socket.id,
        studentId: data.studentId || null,
        studentName: data.studentName || `Student (${socket.id.slice(0, 6)})`,
      });
    });

    // Teacher broadcasts session start to all students in the room
    socket.on('start_session', (data) => {
      console.log(`Teacher started session: ${data.sessionId}`);
      io.to(data.sessionId).emit('session_started', { sessionId: data.sessionId });
    });

    // ── WebRTC Signaling ────────────────────────────────────────────────────────
    // TA/Teacher requests student's camera stream
    socket.on('webrtc_request_stream', (data) => {
      // Forward to the specific student socket so student can initiate offer
      io.to(data.studentSocketId).emit('webrtc_request_stream', {
        fromSocketId: socket.id,
      });
    });

    // Student sends SDP offer → forward to the requesting TA/Teacher
    socket.on('webrtc_offer', (data) => {
      // data: { toSocketId, sdp }
      io.to(data.toSocketId).emit('webrtc_offer', {
        fromSocketId: socket.id,
        sdp: data.sdp,
      });
    });

    // TA/Teacher sends SDP answer → forward back to student
    socket.on('webrtc_answer', (data) => {
      // data: { toSocketId, sdp }
      io.to(data.toSocketId).emit('webrtc_answer', {
        fromSocketId: socket.id,
        sdp: data.sdp,
      });
    });

    // ICE candidates (both directions)
    socket.on('webrtc_ice', (data) => {
      // data: { toSocketId, candidate }
      io.to(data.toSocketId).emit('webrtc_ice', {
        fromSocketId: socket.id,
        candidate: data.candidate,
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};
