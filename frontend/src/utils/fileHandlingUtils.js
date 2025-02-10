// fileHandlingUtils.js
export const handleFileChange = (file, type, setPreview, setValue, maxSize) => {
    if (!file) return;
    
    if (file.size > maxSize) {
      toast.error(`${type} must be less than ${maxSize / (1024 * 1024)}MB`);
      return;
    }
  
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  
    // Set form value
    setValue(`${type.toLowerCase()}`, [file]);
    setValue(`${type.toLowerCase()}Type`, 'file');
  };
  
  export const handleUrlChange = (url, type, setPreview, setValue, validateUrl) => {
    if (validateUrl(url, type)) {
      if (type === 'video' && (url.includes('youtube.com') || url.includes('youtu.be'))) {
        const videoId = url.includes('youtube.com') 
          ? url.split('v=')[1]
          : url.split('youtu.be/')[1];
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        setPreview(embedUrl);
      } else if (type === 'video' && url.includes('vimeo.com')) {
        const videoId = url.split('vimeo.com/')[1];
        const embedUrl = `https://player.vimeo.com/video/${videoId}`;
        setPreview(embedUrl);
      } else {
        setPreview(url);
      }
      setValue(`${type.toLowerCase()}Url`, url);
    } else {
      toast.error(`Please enter a valid ${type.toLowerCase()} URL`);
    }
  };