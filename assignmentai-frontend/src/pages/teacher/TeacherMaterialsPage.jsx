import { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, Trash2, Plus, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMaterials, createMaterial, deleteMaterial } from '../../services/materialService';
import { getUploadUrl, uploadFileToStorage, getDownloadUrl } from '../../services/assignmentService';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';

export default function TeacherMaterialsPage() {
  const { user } = useAuth();
  const toast = useToast();
  
  const [materials, setMaterials] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', subject_id: '' });
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [matsRes, subsRes] = await Promise.all([
        getMaterials(),
        api.get('/admin/subjects').catch(() => ({ data: [] }))
      ]);
      setMaterials(matsRes || []);
      const subs = Array.isArray(subsRes.data) ? subsRes.data : Array.isArray(subsRes) ? subsRes : [];
      setSubjects(subs);
    } catch (err) {
      console.error(err);
      toast({ type: 'error', title: 'Failed to load data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this study material?')) return;
    try {
      await deleteMaterial(id);
      setMaterials(materials.filter(m => m.id !== id));
      toast({ type: 'success', title: 'Material deleted' });
    } catch (err) {
      toast({ type: 'error', title: 'Failed to delete' });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast({ type: 'error', title: 'Please select a file to upload' });
    if (!formData.subject_id) return toast({ type: 'error', title: 'Please select a subject' });

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // 1. Get signed upload URL
      const ext = file.name.split('.').pop();
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { signedUrl, path } = await getUploadUrl({
        bucket: 'study-materials',
        filename,
        contentType: file.type
      });

      // 2. Upload to storage
      await uploadFileToStorage(signedUrl, file, setUploadProgress);

      // 3. Save to database
      const newMat = await createMaterial({
        ...formData,
        file_url: path,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size
      });

      setMaterials([newMat, ...materials]);
      setShowModal(false);
      setFormData({ title: '', description: '', subject_id: '' });
      setFile(null);
      toast({ type: 'success', title: 'Study material published successfully!' });
    } catch (err) {
      console.error(err);
      toast({ type: 'error', title: err.message || 'Failed to upload material' });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (path) => {
    try {
      // It's a public bucket now (or private via signed url)
      // Let's use getDownloadUrl just in case
      const { signedUrl } = await getDownloadUrl({ bucket: 'study-materials', path });
      window.open(signedUrl, '_blank');
    } catch (err) {
      addToast('Failed to open file', 'error');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-ink-primary">Study Materials</h1>
          <p className="text-body-md text-ink-muted">Upload and manage resources for your students.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Upload Material
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : materials.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-2">
          <FileText className="w-12 h-12 text-ink-lighter mx-auto mb-4" />
          <h3 className="text-headline-sm text-ink-primary">No Materials Yet</h3>
          <p className="text-ink-muted mb-6">You haven't uploaded any study materials.</p>
          <button className="btn-secondary" onClick={() => setShowModal(true)}>Upload Now</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map(mat => (
            <div key={mat.id} className="card p-5 flex flex-col hover:shadow-hover transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-primary-50 text-primary rounded-xl">
                  <FileText className="w-6 h-6" />
                </div>
                <button onClick={() => handleDelete(mat.id)} className="p-2 text-ink-lighter hover:text-danger rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-bold text-ink-primary text-lg mb-1 truncate">{mat.title}</h3>
              <p className="text-sm text-ink-muted mb-4 line-clamp-2">{mat.description || 'No description provided.'}</p>
              
              <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-label-sm">
                <span className="bg-surface-elevated px-2 py-1 rounded text-ink-secondary truncate max-w-[120px]">
                  {mat.subjects?.code || 'General'}
                </span>
                <button 
                  onClick={() => handleDownload(mat.file_url)}
                  className="text-primary font-semibold hover:underline"
                >
                  View File
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-ink-primary/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-elevation overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-headline-sm font-bold">Upload Study Material</h2>
              <button onClick={() => !isSubmitting && setShowModal(false)} className="text-ink-muted hover:text-ink-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-label-md text-ink-primary mb-1">Title <span className="text-danger">*</span></label>
                <input 
                  type="text" 
                  required
                  className="input-field" 
                  placeholder="e.g. Chapter 1: Introduction to AI"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-label-md text-ink-primary mb-1">Subject <span className="text-danger">*</span></label>
                <select 
                  required
                  className="input-field"
                  value={formData.subject_id}
                  onChange={e => setFormData({ ...formData, subject_id: e.target.value })}
                >
                  <option value="">Select a subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-label-md text-ink-primary mb-1">Description</label>
                <textarea 
                  className="input-field min-h-[80px]" 
                  placeholder="Brief context or instructions..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-label-md text-ink-primary mb-1">File <span className="text-danger">*</span></label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-surface transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    required
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {file ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="w-8 h-8 text-success mb-2" />
                      <p className="font-semibold text-ink-primary truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-ink-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <UploadCloud className="w-8 h-8 text-primary mb-2" />
                      <p className="font-semibold text-ink-primary">Click to select or drag & drop</p>
                      <p className="text-xs text-ink-muted mt-1">PDF, PPTX, DOCX, Images, Videos (Max 20MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {isSubmitting && (
                <div className="w-full bg-surface-elevated rounded-full h-2 mt-2 overflow-hidden">
                  <div className="bg-primary h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              <div className="mt-4 flex gap-3 pt-4 border-t border-border">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="btn-secondary flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                  ) : 'Publish Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
