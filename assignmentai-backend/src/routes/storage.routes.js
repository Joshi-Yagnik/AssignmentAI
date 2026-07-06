const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const { requireAuth } = require('../middleware/auth.middleware');

// GET signed upload URL for direct storage uploads
router.post('/upload-url', requireAuth, async (req, res) => {
  try {
    const { bucket, filename, contentType } = req.body;

    if (!bucket || !filename) {
      return res.status(400).json({ error: 'Bucket and filename required' });
    }

    // This creates a signed upload URL valid for 60 seconds.
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filename);

    if (error) throw error;

    // We do NOT return the publicUrl because these buckets should be private.
    // The frontend should store the `path` and request a download-url later.
    res.json({
      signedUrl: data.signedUrl,
      path: data.path
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET signed download URL for secure access to private files
router.post('/download-url', requireAuth, async (req, res) => {
  try {
    const { bucket, path, expiresIn = 3600 } = req.body;

    if (!bucket || !path) {
      return res.status(400).json({ error: 'Bucket and path required' });
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn); // 1 hour by default

    if (error) throw error;

    res.json({ signedUrl: data.signedUrl });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
