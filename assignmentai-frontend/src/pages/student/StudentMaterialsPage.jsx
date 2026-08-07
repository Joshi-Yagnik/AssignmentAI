import { useState, useEffect } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { getMaterials } from '../../services/materialService';
import { getDownloadUrl } from '../../services/assignmentService';
import { useToast } from '../../components/shared/Toast';

export default function StudentMaterialsPage() {
  const toast = useToast();
  
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewedMaterials, setViewedMaterials] = useState([]);

  useEffect(() => {
    // Load viewed materials from localStorage
    const viewed = JSON.parse(localStorage.getItem('viewed_materials') || '[]');
    setViewedMaterials(viewed);
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const mats = await getMaterials();
      setMaterials(mats);
    } catch (err) {
      console.error(err);
      toast({ type: 'error', title: 'Failed to load study materials' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (mat) => {
    // Mark as viewed
    if (!viewedMaterials.includes(mat.id)) {
      const updated = [...viewedMaterials, mat.id];
      setViewedMaterials(updated);
      localStorage.setItem('viewed_materials', JSON.stringify(updated));
    }

    try {
      const { signedUrl } = await getDownloadUrl({ bucket: 'study-materials', path: mat.file_url });
      window.open(signedUrl, '_blank');
    } catch (err) {
      toast({ type: 'error', title: 'Failed to open file' });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="mb-8">
        <h1 className="text-headline-md font-bold text-ink-primary">Study Materials</h1>
        <p className="text-body-md text-ink-muted">Resources and notes uploaded by your professors.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : materials.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-2">
          <FileText className="w-12 h-12 text-ink-lighter mx-auto mb-4" />
          <h3 className="text-headline-sm text-ink-primary">No Materials Found</h3>
          <p className="text-ink-muted">There are currently no study materials available for your subjects.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map(mat => {
            const isNew = !viewedMaterials.includes(mat.id);
            return (
              <div key={mat.id} className="card p-5 flex flex-col hover:shadow-hover transition-shadow relative">
                {isNew && (
                  <span className="absolute top-4 right-4 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full animate-pulse-soft">
                    New
                  </span>
                )}
                
                <div className="p-3 bg-primary-50 text-primary rounded-xl w-12 h-12 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                
                <h3 className="font-bold text-ink-primary text-lg mb-1 truncate pr-8">{mat.title}</h3>
                <p className="text-sm text-ink-muted mb-4 line-clamp-2">{mat.description || 'No description provided.'}</p>
                
                <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-label-sm">
                  <div>
                    <p className="font-medium text-ink-primary truncate max-w-[120px]">{mat.subjects?.code || 'General'}</p>
                    <p className="text-xs text-ink-lighter">{new Date(mat.created_at).toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={() => handleDownload(mat)}
                    className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Open
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
