import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

interface PageSwitcherProps {
  template: any;
  sceneStorageKey: string | null;
  engine: any;
  onPageChange?: (pageIndex: number) => void;
}

export const PageSwitcher: React.FC<PageSwitcherProps> = ({
  template,
  sceneStorageKey,
  engine,
  onPageChange,
}) => {
  const [pages, setPages] = useState<any[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch scene data to get page information
    const loadPageInfo = async () => {
      if (!template?.isPSDImport || !sceneStorageKey) return;

      try {
        const sceneUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${sceneStorageKey}`;
        const response = await fetch(sceneUrl);
        const sceneData = await response.json();

        if (sceneData?.meta?.isMultiPSDImport && sceneData?.meta?.pageArchives) {
          setPages(sceneData.meta.pageArchives);
          setCurrentPageIndex(sceneData.meta.currentPageIndex || 0);
        }
      } catch (error) {
        console.error('Error loading page info:', error);
      }
    };

    loadPageInfo();
  }, [template, sceneStorageKey]);

  const handlePageSwitch = async (pageIndex: number) => {
    if (pageIndex === currentPageIndex || isLoading || !engine) return;

    setIsLoading(true);
    try {
      const contentId = sceneStorageKey?.replace(/\.json$/i, '') || template?.content;
      const pageKey = `psd_archive_${contentId}_page_${pageIndex}`;
      const pageArchiveData = pages[pageIndex];

      const { getBlobFromIndexedDB } = await import('@Helpers/IndexedDBStorage');
      let pageBlob = await getBlobFromIndexedDB(pageKey);

      // If not in IndexedDB, try loading from server
      if (!pageBlob && pageArchiveData?.archiveUrl) {
        const serverUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${pageArchiveData.archiveUrl}`;
        await engine.scene.loadFromArchiveURL(serverUrl);
        setCurrentPageIndex(pageIndex);
        onPageChange?.(pageIndex);
        toast(`Switched to page: ${pages[pageIndex].pageName}`, { type: 'success' });
        return;
      }

      if (pageBlob) {
        const tempUrl = URL.createObjectURL(pageBlob);
        await engine.scene.loadFromArchiveURL(tempUrl);
        URL.revokeObjectURL(tempUrl);

        setCurrentPageIndex(pageIndex);
        onPageChange?.(pageIndex);

        toast(`Switched to page: ${pages[pageIndex].pageName}`, { type: 'success' });
      } else {
        throw new Error('Page archive not found in IndexedDB or server storage');
      }
    } catch (error) {
      console.error('Error switching pages:', error);
      toast('Failed to switch pages', { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (pages.length <= 1) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '60px',
        left: '10px',
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        padding: '8px',
        zIndex: 1000,
        maxWidth: '250px',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
        Pages ({pages.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {pages.map((page, index) => (
          <button
            key={index}
            onClick={() => handlePageSwitch(index)}
            disabled={isLoading || index === currentPageIndex}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderRadius: '4px',
              background: index === currentPageIndex ? '#007bff' : '#f0f0f0',
              color: index === currentPageIndex ? '#fff' : '#333',
              cursor: index === currentPageIndex ? 'default' : 'pointer',
              fontSize: '12px',
              fontWeight: index === currentPageIndex ? 'bold' : 'normal',
              textAlign: 'left',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {index + 1}. {page.pageName}
          </button>
        ))}
      </div>
    </div>
  );
};
