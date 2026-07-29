import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { logSecurityViolation } from '../services/proctoringService';
import { useToast } from '../components/shared/Toast';

export function useProctoring({
  isActive = true,
  source, // 'viva' or 'assignment'
  referenceId,
  subjectId,
  videoRef, // ref to the HTMLVideoElement
}) {
  const toast = useToast();
  const [warnings, setWarnings] = useState(0);
  const [faceStatus, setFaceStatus] = useState('Initializing...');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  // Track last logged violation to prevent spamming backend every 3 seconds
  const lastLoggedRef = useRef({ type: null, time: 0 });

  const logViolation = useCallback(async (violationType, severity = 'medium', details = {}) => {
    const now = Date.now();
    const last = lastLoggedRef.current;
    
    // Throttle duplicate violations to once every 10 seconds
    if (last.type === violationType && now - last.time < 10000) {
      return;
    }
    
    lastLoggedRef.current = { type: violationType, time: now };
    setWarnings((prev) => prev + 1);

    try {
      await logSecurityViolation({
        source,
        reference_id: referenceId,
        subject_id: subjectId,
        violation_type: violationType,
        severity,
        details,
      });
      
      let message = '';
      if (violationType === 'tab_switch') message = 'Navigating away from the exam tab is not allowed.';
      if (violationType === 'face_lost') message = 'Face not detected in webcam.';
      if (violationType === 'multiple_faces') message = 'Multiple faces detected in webcam.';
      
      toast({ type: 'error', title: 'Security Warning', message });
    } catch (err) {
      console.error('[Proctoring] Failed to log violation', err);
    }
  }, [source, referenceId, subjectId, toast]);

  // ── 1. Tab Switching Detection ──────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('tab_switch', 'high');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive, logViolation]);

  // ── 2. Face Recognition Setup ───────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;

    let isMounted = true;
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        ]);
        if (isMounted) setModelsLoaded(true);
      } catch (err) {
        console.error('[Proctoring] Failed to load face-api models', err);
        if (isMounted) setFaceStatus('Model Load Failed');
      }
    };

    loadModels();
    return () => { isMounted = false; };
  }, [isActive]);

  // ── 3. Face Detection Loop ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !modelsLoaded || !videoRef?.current) return;

    let intervalId;

    const detectFace = async () => {
      const video = videoRef.current;
      if (video.paused || video.ended || !video.srcObject) return;

      try {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
        
        if (detections.length === 0) {
          setFaceStatus('Face Lost');
          logViolation('face_lost', 'high');
        } else if (detections.length > 1) {
          setFaceStatus('Multiple Faces');
          logViolation('multiple_faces', 'critical');
        } else {
          setFaceStatus('Face ID: Verified ✓');
        }
      } catch (err) {
        // Ignore errors during transition or unmounting
      }
    };

    // Run detection every 3 seconds
    intervalId = setInterval(detectFace, 3000);

    return () => clearInterval(intervalId);
  }, [isActive, modelsLoaded, videoRef, logViolation]);

  return { warnings, faceStatus, modelsLoaded };
}
