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
            // Reset form with draft data
            formMethods.reset({
              title: draftData.title,
              category_id: draftData.category_id?.toString(),
              goal_amount: draftData.goal_amount,
              start_date: draftData.start_date?.split('T')[0],
              end_date: draftData.end_date?.split('T')[0],
              description: draftData.description,
              risk_and_challenges: draftData.risk_and_challenges,
              featured: draftData.featured,
              imageUrl: draftData.image_url || '',
              videoUrl: draftData.video_url || '',
              imageType: draftData.image_url ? 'url' : 'file',
              videoType: draftData.video_url ? 'url' : 'file'
            });
            
            // Set previews if they exist
            if (draftData.image_url) setImagePreview(draftData.image_url);
            if (draftData.video_url) setVideoPreview(draftData.video_url);
          }
        } catch (error) {
          toast.error('Failed to load draft data');
          console.error('Error loading draft:', error);
        }
      }
    };
  
    loadDraftData();
  }, [projectId, isDraftEdit, formMethods]);

  const handleFilePreview = (file, type) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        if (type === 'image') {
          setImagePreview(reader.result);
        } else if (type === 'video') {
          setVideoPreview(reader.result);
        }
      } catch (error) {
        console.error(`Error creating ${type} preview:`, error);
        toast.error(`Failed to preview ${type}`);
      }
    };
    
    reader.onerror = () => {
      toast.error(`Failed to read ${type} file`);
    };
    
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read file');
    }
  };

  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  const handleFormSubmit = async (data, isDraft = false) => {
    setIsSubmitting(true);
    try {
      const formData = createFormData(data, isDraft);
      
      const response = isDraftEdit
        ? await projectService.updateDraft(projectId, formData)
        : await projectService.createProject(formData, isDraft);
      
      if (response?.data) {
        toast.success(isDraft ? 'Draft saved' : 'Project created');
        return true;
      }
      return false;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUrlChange = (url) => {
    if (validateMediaUrl(url, 'image')) {
      setImagePreview(url);
      formMethods.setValue('imageUrl', url);
    } else {
      toast.error('Please enter a valid image URL');
    }
  };

  const handleVideoUrlChange = (url) => {
    if (validateMediaUrl(url, 'video')) {
      // For YouTube videos, convert to embed URL
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.includes('youtube.com') 
          ? url.split('v=')[1]
          : url.split('youtu.be/')[1];
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        setVideoPreview(embedUrl);
        formMethods.setValue('videoUrl', url);
      } else if (url.includes('vimeo.com')) {
        // Handle Vimeo videos
        const videoId = url.split('vimeo.com/')[1];
        const embedUrl = `https://player.vimeo.com/video/${videoId}`;
        setVideoPreview(embedUrl);
        formMethods.setValue('videoUrl', url);
      } else {
        setVideoPreview(url);
        formMethods.setValue('videoUrl', url);
      }
    } else {
      toast.error('Please enter a valid video URL (YouTube or Vimeo)');
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      try {
        handleFilePreview(file, 'image');
        formMethods.setValue('image', [file]);
      } catch (error) {
        toast.error('Failed to process image');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFilePreview(file, 'video');
      formMethods.setValue('video', [file]);
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
    handleVideoUrlChange
  };
};