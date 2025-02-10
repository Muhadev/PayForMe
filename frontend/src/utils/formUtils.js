// utils/formUtils.js
export const createFormData = (data, isDraft) => {
  const formData = new FormData();
  
  // Basic fields
  formData.append('status', isDraft ? 'DRAFT' : 'PENDING');
  formData.append('title', data.title);

  // Handle image
  if (data.imageType === 'file' && data.image?.[0]) {
    formData.append('image_file', data.image[0]);
    formData.delete('image_url'); // Remove URL if exists
  } else if (data.imageType === 'url' && data.imageUrl) {
    formData.append('image_url', data.imageUrl);
    formData.delete('image_file'); // Remove file if exists
  }

  // Handle video
  if (data.videoType === 'file' && data.video?.[0]) {
    formData.append('video_file', data.video[0]);
    formData.delete('video_url'); // Remove URL if exists
  } else if (data.videoType === 'url' && data.videoUrl) {
    formData.append('video_url', data.videoUrl);
    formData.delete('video_file'); // Remove file if exists
  }

  // Add other fields
  const fields = {
    description: data.description,
    risk_and_challenges: data.risk_and_challenges,
    goal_amount: data.goal_amount,
    category_id: data.category_id,
    start_date: data.start_date,
    end_date: data.end_date,
    featured: data.featured || false
  };

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value.toString());
    }
  });

  return formData;
};

export const validateMediaUrl = (url, type = 'image') => {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (type === 'video') {
      const validVideoDomains = [
        'youtube.com', 
        'youtu.be', 
        'vimeo.com', 
        'player.vimeo.com'
      ];
      return validVideoDomains.some(domain => hostname.includes(domain));
    } else {
      const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      const validImageDomains = [
        'googleusercontent.com', 
        'imgur.com', 
        'gyazo.com'
      ];
      
      return validImageExtensions.some(ext => url.toLowerCase().endsWith(ext)) ||
             validImageDomains.some(domain => hostname.includes(domain));
    }
  } catch (e) {
    return false;
  }
};