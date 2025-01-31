// utils/formUtils.js
export const createFormData = (data, isDraft) => {
    const formData = new FormData();
    
    // Append status based on isDraft
    formData.append('status', isDraft ? 'DRAFT' : 'PENDING');
    
    // Required fields
    formData.append('title', data.title);
    
    // Handle rich text fields
    if (!isDraft || data.description) {
      formData.append('description', data.description || '');
    }
    
    if (!isDraft || data.risk_and_challenges) {
      formData.append('risk_and_challenges', data.risk_and_challenges || '');
    }
    
    // Handle numeric fields
    if (!isDraft || data.goal_amount) {
      formData.append('goal_amount', data.goal_amount || 0);
    }
    
    if (!isDraft || data.category_id) {
      formData.append('category_id', data.category_id || '');
    }
    
    // Handle dates
    if (!isDraft || data.start_date) {
      formData.append('start_date', data.start_date || '');
    }
    
    if (!isDraft || data.end_date) {
      formData.append('end_date', data.end_date || '');
    }
    
    // Handle media files
    if (data.imageType === 'file' && data.image?.[0]) {
      formData.append('image_file', data.image[0]);
    } else if (data.imageType === 'url' && data.imageUrl) {
      formData.append('image_url', data.imageUrl);
    }
    
    if (data.videoType === 'file' && data.video?.[0]) {
      formData.append('video_file', data.video[0]);
    } else if (data.videoType === 'url' && data.videoUrl) {
      formData.append('video_url', data.videoUrl);
    }
    
    // Handle boolean fields
    formData.append('featured', data.featured || false);
    
    return formData;
  };