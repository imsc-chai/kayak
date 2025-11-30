import { adminAPI } from '../services/api';

// Track page clicks
export const trackPageClick = async (pageName, metadata = {}) => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = user?._id || user?.id || null;
    
    await adminAPI.trackClick({
      clickType: 'page',
      pageName,
      userId,
      metadata
    });
  } catch (error) {
    // Silently fail - don't interrupt user experience
    console.debug('Click tracking failed:', error);
  }
};

// Track property clicks
export const trackPropertyClick = async (propertyId, propertyType, metadata = {}) => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = user?._id || user?.id || null;
    
    await adminAPI.trackClick({
      clickType: 'property',
      propertyId,
      propertyType,
      userId,
      metadata
    });
  } catch (error) {
    console.debug('Property click tracking failed:', error);
  }
};

// Track section views
export const trackSectionView = async (sectionName, metadata = {}) => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = user?._id || user?.id || null;
    
    await adminAPI.trackClick({
      clickType: 'section',
      sectionName,
      userId,
      metadata
    });
  } catch (error) {
    console.debug('Section view tracking failed:', error);
  }
};

