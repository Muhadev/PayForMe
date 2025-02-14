import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import * as projectService from '../services/projectService';
import { createFormData, validateMediaUrl } from '../utils/formUtils';

export const useProjectForm = (projectId, isDraftEdit) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);


  // Helper function to validate URLs
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;  
    } catch (e) {
      return false;
    }
  };

  const formMethods = useForm({
    defaultValues: {
      title: '',
      category_id: '',
      goal_amount: '',
      start_date: '',
      end_date: '',
      description: '',
      risk_and_challenges: '',
      image: null,
      imageUrl: '',
      imageType: 'file',
      video: null,
      videoUrl: '',
      videoType: 'file',
      featured: false
    },
    resolver: (data, context) => {
      const errors = {};
      
      // Title is always required
      if (!data.title) {
        errors.title = {
          type: 'required',
          message: 'Title is required'
        };
      }
      
      // Only validate other fields if not saving as draft
      if (!context?.isDraft) {
        if (!data.category_id) {
          errors.category_id = {
            type: 'required',
            message: 'Category is required'
          };
        }
  
        if (!data.goal_amount) {
          errors.goal_amount = {
            type: 'required',
            message: 'Goal amount is required'
          };
        } else if (isNaN(Number(data.goal_amount)) || Number(data.goal_amount) <= 0) {
          errors.goal_amount = {
            type: 'validate',
            message: 'Goal amount must be a positive number'
          };
        }
  
        if (!data.start_date) {
          errors.start_date = {
            type: 'required',
            message: 'Start date is required'
          };
        }
  
        if (!data.end_date) {
          errors.end_date = {
            type: 'required',
            message: 'End date is required'
          };
        }
  
        // Validate date range if both dates are provided
        if (data.start_date && data.end_date) {
          const startDate = new Date(data.start_date);
          const endDate = new Date(data.end_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
  
          if (startDate < today) {
            errors.start_date = {
              type: 'validate',
              message: 'Start date cannot be in the past'
            };
          }
  
          if (endDate <= startDate) {
            errors.end_date = {
              type: 'validate',
              message: 'End date must be after start date'
            };
          }
        }
  
        if (!data.description || data.description === '<p></p>' || data.description === '<p><br></p>') {
          errors.description = {
            type: 'required',
            message: 'Description is required'
          };
        }
  
        if (!data.risk_and_challenges || data.risk_and_challenges === '<p></p>' || data.risk_and_challenges === '<p><br></p>') {
          errors.risk_and_challenges = {
            type: 'required',
            message: 'Risks and challenges are required'
          };
        }
      }
  
      // Image validation (if image type is 'file' and image is provided)
      if (data.imageType === 'file' && data.image?.[0]) {
        const file = data.image[0];
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        const maxSize = 5 * 1024 * 1024; // 5MB
  
        if (!allowedTypes.includes(file.type)) {
          errors.image = {
            type: 'validate',
            message: 'Image must be in JPEG, PNG, or GIF format'
          };
        } else if (file.size > maxSize) {
          errors.image = {
            type: 'validate',
            message: 'Image must be less than 5MB'
          };
        }
      }
  
      // Image URL validation (if image type is 'url' and URL is provided)
      if (data.imageType === 'url' && data.imageUrl && !isValidUrl(data.imageUrl)) {
        errors.imageUrl = {
          type: 'validate',
          message: 'Please enter a valid image URL'
        };
      }
  
      if (data.videoType === 'file' && data.video?.[0]) {
        const file = data.video[0];
        const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
        const maxSize = 100 * 1024 * 1024; // 100MB
      
        if (!allowedTypes.includes(file.type)) {
          errors.video = {
            type: 'validate',
            message: 'Video must be in MP4, WebM, or OGG format'
          };
        } else if (file.size > maxSize) {
          errors.video = {
            type: 'validate',
            message: 'Video must be less than 100MB'
          };
        }
      }
        
      // Video URL validation (if video type is 'url' and URL is provided)
      if (data.videoType === 'url' && data.videoUrl && !isValidUrl(data.videoUrl)) {
        errors.videoUrl = {
          type: 'validate',
          message: 'Please enter a valid video URL'
        };
      }
      
      return {
        values: data,
        errors: Object.keys(errors).length > 0 ? errors : {}
      };
    }
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await projectService.fetchCategories();
        if (result?.data) {
          setCategories(result.data);
        } else {
          console.error('Invalid categories data format:', result);
          setCategories([]);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
        toast.error('Failed to load categories');
        setCategories([]);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const loadDraftData = async () => {
      if (projectId && isDraftEdit) {
        try {
          const response = await projectService.fetchDraft(projectId);
          if (response?.data) {
            const draftData = response.data;
            
            // Determine if the image/video are uploaded files or external URLs
            const isUploadedImage = draftData.image_url?.startsWith('/uploads/') || 
                                  draftData.image_url?.startsWith('uploads/');
            const isUploadedVideo = draftData.video_url?.startsWith('/uploads/') || 
                                  draftData.video_url?.startsWith('uploads/');
  
            formMethods.reset({
              ...draftData,
              imageType: isUploadedImage ? 'file' : 'url',
              videoType: isUploadedVideo ? 'file' : 'url',
              imageUrl: !isUploadedImage ? draftData.image_url : '',
              videoUrl: !isUploadedVideo ? draftData.video_url : ''
            });
  
            // Set preview URLs with full path for uploaded files
            if (isUploadedImage) {
              setImagePreview(`${process.env.REACT_APP_BACKEND_URL}/${draftData.image_url.replace(/^\//, '')}`);
            } else if (draftData.image_url) {
              setImagePreview(draftData.image_url);
            }
  
            if (isUploadedVideo) {
              setVideoPreview(`${process.env.REACT_APP_BACKEND_URL}/${draftData.video_url.replace(/^\//, '')}`);
            } else if (draftData.video_url) {
              setVideoPreview(draftData.video_url);
            }
          }
        } catch (error) {
          toast.error('Failed to load draft data');
          console.error('Error loading draft:', error);
        }
      }
    };
  
    loadDraftData();
  }, [projectId, isDraftEdit, formMethods]);

  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  const handleImageUrlChange = (url) => {
    if (validateMediaUrl(url, 'image')) {
      // For uploaded files, construct the correct URL
      const fullUrl = url.startsWith('/uploads/') 
        ? `${process.env.REACT_APP_BACKEND_URL}/api/v1/projects${url}`
        : url;
      setImagePreview(fullUrl);
      formMethods.setValue('imageUrl', url);
    } else {
      toast.error('Please enter a valid image URL');
    }
  };

  
  const handleVideoUrlChange = (url) => {
    if (validateMediaUrl(url, 'video')) {
      // For uploaded files, construct the correct URL
      const fullUrl = url.startsWith('/uploads/') 
        ? `${process.env.REACT_APP_BACKEND_URL}/api/v1/projects${url}`
        : url;
        
      // Handle YouTube/Vimeo URLs
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.includes('youtube.com') 
          ? url.split('v=')[1]
          : url.split('youtu.be/')[1];
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        setVideoPreview(embedUrl);
      } else if (url.includes('vimeo.com')) {
        const videoId = url.split('vimeo.com/')[1];
        const embedUrl = `https://player.vimeo.com/video/${videoId}`;
        setVideoPreview(embedUrl);
      } else {
        setVideoPreview(fullUrl);
      }
      formMethods.setValue('videoUrl', url);
    } else {
      toast.error('Please enter a valid video URL (YouTube or Vimeo)');
    }
  };

  // Update the handlers in CreateProjectForm to include proper URL construction
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      try {
        // Create preview URL
        const objectUrl = URL.createObjectURL(file);
        setImagePreview(objectUrl);
        
        // Store the actual file
        setImageFile(file);
  
        // Set form value
        formMethods.setValue('image', [file]);
        formMethods.setValue('imageType', 'file');
      } catch (error) {
        toast.error('Failed to process image');
        console.error('Image processing error:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };
  
  const handleVideoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      try {
        // Check file size
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
          toast.error('Video must be less than 100MB');
          return;
        }
  
        // Create preview
        const objectUrl = URL.createObjectURL(file);
        setVideoPreview(objectUrl);

        // Store the actual file
        setVideoFile(file);
  
        // Set form value
        formMethods.setValue('video', [file]);
        formMethods.setValue('videoType', 'file');
      } catch (error) {
        toast.error('Failed to process video');
        console.error('Video processing error:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      // Revoke blob URLs to free up memory
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      if (videoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [imagePreview, videoPreview]);

  const handleFormSubmit = async (data, isDraft = false) => {
    setIsSubmitting(true);
    try {
      const formData = createFormData(data, isDraft);
      const response = await projectService.createProject(formData, isDraft);
      toast.success(isDraft ? 'Draft saved' : 'Project created');
      return response;
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error(error.response?.data?.message || 'Operation failed');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    ...formMethods,
    categories,
    isSubmitting,
    imagePreview,
    setImagePreview,
    videoPreview,
    setVideoPreview,
    handleFormSubmit,
    handleImageChange,
    handleVideoChange,
    handleImageUrlChange,
    handleVideoUrlChange,
    isUploading
  };
};