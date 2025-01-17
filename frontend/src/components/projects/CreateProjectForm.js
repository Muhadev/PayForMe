import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Image, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
// import axiosInstance from '../../helper/axiosConfig'; 
import { refreshAccessToken } from '../../helper/authHelpers'; 
import { useForm, Controller } from 'react-hook-form';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';


// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
  // withCredentials: true,
  headers: {
    'Accept': 'application/json',
    // 'Content-Type': 'application/json'
  }
});

// Add request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  console.log('Access Token:', localStorage.getItem('accessToken'));
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Authorization header set:', config.headers.Authorization);
  } else {
    console.warn('Token is missing from local storage');
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add this after your request interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response Interceptor:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Error Interceptor:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);
function CreateProjectForm() {
  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues, control } = useForm({
    defaultValues: {
      title: "",
      category_id: "",
      goal_amount: "",
      start_date: "",
      end_date: "",
      description: "",
      risk_and_challenges: "",
      image: null,
      imageUrl: "",
      imageType: "file",
      video: null,
      videoUrl: "",
      videoType: "file",
      featured: false // Default value for the featured field
    },
    mode: 'onBlur'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const navigate = useNavigate();

  const watchImageType = watch('imageType', 'file');
  const watchVideoType = watch('videoType');

  const fetchCategories = async () => {
    setIsLoading(true); // Show loading spinner
    try {
      const response = await api.get('/api/v1/categories/');
      console.log('Categories response:', response.data);
      if (response?.data?.data?.length) {
        setCategories(response.data.data);
      } else {
        toast.error('Invalid category data format received');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      const errorMessage = error.response?.data?.error || 'Failed to fetch categories';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false); // Hide loading spinner
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const onSubmit = async (data, isDraft = false) => {
    setIsLoading(true);
    const formData = new FormData();
    // Always append title for both draft and non-draft
    try{
      formData.append("title", data.title);

      // Convert featured to boolean string that Python can parse
      if (data.featured !== undefined) {
        // Convert to lowercase string 'true' or 'false'
        formData.append('featured', String(Boolean(data.featured)).toLowerCase());
      }

      // Append status (either draft or pending)
      formData.append('status', isDraft ? 'draft' : 'pending');

      // Only append other fields if it's not a draft
      if (!isDraft) {
        if (data.description) formData.append('description', data.description);
        if (data.goal_amount) formData.append('goal_amount', data.goal_amount);
        if (data.start_date) formData.append('start_date', data.start_date);
        if (data.end_date) formData.append('end_date', data.end_date);
        if (data.category_id) formData.append('category_id', data.category_id);
        if (data.risk_and_challenges) formData.append('risk_and_challenges', data.risk_and_challenges);
        // formData.append("featured", data.featured);/
      }
      // Handle optional fields
      // if (data.featured !== undefined) formData.append('featured', data.featured);

      // Handle media files
      if (data.imageType === 'file' && data.image?.[0]) {
        formData.append('image', data.image[0]);
      } else if (data.imageType === 'url' && data.imageUrl) {
        formData.append('imageUrl', data.imageUrl);
      }

      if (data.videoType === 'file' && data.video?.[0]) {
        formData.append('video', data.video[0]);
      } else if (data.videoType === 'url' && data.videoUrl) {
        formData.append('videoUrl', data.videoUrl);
      }

      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      const endpoint = isDraft ? '/api/v1/projects/drafts' : '/api/v1/projects';
    
      // Let axios set the correct Content-Type header for FormData
      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Full API Response:', response);
      console.log('Response data:', response.data);
      console.log('Response status:', response.status);

      // Check if we have a valid response with data
    if (response.status === 201 && response.data) {
      const projectData = response.data.data || response.data;
      toast.success(isDraft ? 'Project saved as draft' : 'Project submitted successfully!');
      navigate(isDraft ? 
        `/projects/drafts/${projectData.id}` : 
        `/projects/${projectData.id}`
      );
    } else {
      console.error('Unexpected response structure:', response);
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Detailed error:', error);
    console.error('Error response:', error.response);
    if (error.response?.status === 401) {
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          return onSubmit(data, isDraft);
        }
      } catch (refreshError) {
        toast.error('Session expired. Please log in again.');
        return;
      }
    }
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'Failed to save project';
    toast.error(errorMessage);
  } finally {
    setIsLoading(false);
  }
};


  // Updated getValidationRules function with all fields
const getValidationRules = (fieldName, isDraft) => {
  const baseRules = {
    title: { 
      required: "Title is required",
      maxLength: { value: 100, message: "Title must be 100 characters or less" }
    },
    description: { 
      required: !isDraft && "Description is required",
      maxLength: { value: 5000, message: "Description must be 5000 characters or less" }
    },
    goal_amount: { 
      required: !isDraft && "Goal amount is required",
      min: { value: 1, message: "Goal amount must be positive" },
      validate: value => !value || value > 0 || "Goal amount must be greater than 0"
    },
    category_id: { 
      required: !isDraft && "Category is required" 
    },
    start_date: { 
      required: !isDraft && "Start date is required",
      validate: {
        futureDate: date => !date || new Date(date) >= new Date().setHours(0, 0, 0, 0) || "Start date must be in the future"
      }
    },
    end_date: { 
      required: !isDraft && "End date is required",
      validate: {
        futureDate: date => !date || new Date(date) >= new Date().setHours(0, 0, 0, 0) || "End date must be in the future",
        afterStartDate: (date, formValues) => 
          !date || !formValues.start_date || new Date(date) > new Date(formValues.start_date) || 
          "End date must be after start date"
      }
    },
    risk_and_challenges: {
      required: !isDraft && "Risks and challenges are required",
      maxLength: { value: 1000, message: "Risks and challenges must be 1000 characters or less" }
    },
    image: {
      validate: {
        acceptedFormats: files => 
          !files?.[0] || ['image/jpeg', 'image/png', 'image/gif'].includes(files[0]?.type) || 
          "Only JPEG, PNG and GIF files are allowed"
      }
    },
    video: {
      validate: {
        acceptedFormats: files =>
          !files?.[0] || ['video/mp4', 'video/quicktime'].includes(files[0]?.type) ||
          "Only MP4 and MOV files are allowed"
      }
    }
  };

  return baseRules[fieldName] || {};
};

  // Handle image file input safely
  const handleImageChange = (e) => {
    const file = e.target.files[0] || null;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      setValue('image', [file]);
    } else {
      setValue('image', null);
    }
  };

  // Handle video file input safely
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setVideoPreview(reader.result);
      reader.readAsDataURL(file);
      setValue('video', [file]);
    }
  };

  const ProjectPreview = () => (
    <div className="project-preview">
      <h2>{getValues('title')}</h2>
      <p>Category: {categories.find(c => c.id === parseInt(getValues('category_id')))?.name}</p>
      <p>Goal: ${getValues('goal_amount')}</p>
      <p>Duration: {getValues('start_date')} to {getValues('end_date')}</p>
      {watchImageType === 'file' && imagePreview && (
        <Image src={imagePreview} alt="Project preview" fluid />
      )}
      {watchImageType === 'url' && getValues('imageUrl') && (
        <Image src={getValues('imageUrl')} alt="Project preview" fluid />
      )}
      <div dangerouslySetInnerHTML={{ __html: getValues('description') }} />
      <h4>Risks and Challenges</h4>
      <p>{getValues('risk_and_challenges')}</p>
      {watchVideoType === 'file' && videoPreview && (
        <video src={videoPreview} controls width="100%" />
      )}
      {watchVideoType === 'url' && getValues('videoUrl') && (
        <p>Video URL: {getValues('videoUrl')}</p>
      )}
    </div>
  );

  const ProjectGuidelines = () => (
    <div className="project-guidelines">
      <h3>Tips for a Successful Project</h3>
      <ul>
        <li>Choose a clear, attention-grabbing title</li>
        <li>Set a realistic funding goal</li>
        <li>Provide a detailed description of your project</li>
        <li>Add high-quality images or videos</li>
        <li>Clearly explain how the funds will be used</li>
        <li>Offer compelling rewards to backers</li>
        <li>Create a project timeline</li>
        <li>Be transparent about potential risks and challenges</li>
      </ul>
    </div>
  );

  return (
    <>
      <Button variant="info" className="mb-3" onClick={() => setShowGuidelines(true)}>
        View Project Guidelines
      </Button>
      <Form onSubmit={handleSubmit((data) => onSubmit(data, false))}>
        <Form.Group className="mb-3">
          <Form.Label>Project Title</Form.Label>
          <Form.Control 
            type="text"
            {...register("title", getValidationRules("title", false), { 
              maxLength: { value: 100, message: "Title must be 100 characters or less" }
            })}
          />
          {errors.title && <span className="text-danger">{errors.title.message}</span>}
        </Form.Group>

        <Form.Group controlId="category_id" className="mb-3">
          <Form.Label>Category</Form.Label>
          <Form.Control 
            as="select"
            {...register("category_id", getValidationRules("category_id", false))}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Form.Control>
          {errors.category_id && <span className="text-danger">{errors.category_id.message}</span>}
        </Form.Group>

        <Row>
          <Col>
            <Form.Group className="mb-3">
              <Form.Label>Funding Goal ($)</Form.Label>
              <Form.Control 
                type="number"
                {...register("goal_amount", getValidationRules("goal_amount", false))}
              />
              {errors.goal_amount && <span className="text-danger">{errors.goal_amount.message}</span>}
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col>
            <Form.Group className="mb-3">
              <Form.Label>Start Date</Form.Label>
              <Form.Control 
                type="date"
                {...register("start_date", getValidationRules("start_date", false))}
              />
              {errors.start_date && <span className="text-danger">{errors.start_date.message}</span>}
            </Form.Group>
          </Col>
          <Col>
            <Form.Group className="mb-3">
              <Form.Label>End Date</Form.Label>
              <Form.Control 
                type="date"
                {...register("end_date", getValidationRules("end_date", false))}
              />
              {errors.end_date && <span className="text-danger">{errors.end_date.message}</span>}
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>Project Description</Form.Label>
          <Controller
            name="description"
            control={control}
            rules={getValidationRules("description", false)}
            render={({ field }) => <ReactQuill {...field} />}
          />
          {errors.description && <span className="text-danger">{errors.description.message}</span>}
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Risks and Challenges</Form.Label>
          <Controller
            name="risk_and_challenges"
            control={control}
            rules={getValidationRules("risk_and_challenges", false)}
            render={({ field }) => <ReactQuill {...field} />}
          />
          {errors.risk_and_challenges && <span className="text-danger">{errors.risk_and_challenges.message}</span>}
        </Form.Group>

        {/* <Form.Group className="mb-3">
          <Form.Label>Risks and Challenges</Form.Label>
          <Form.Control 
            as="textarea" 
            rows={3}
            {...register("risk_and_challenges", { 
              required: !isDraft ? "Risks and challenges are required" : false, 
              maxLength: { value: 1000, message: "Risks and challenges must be 1000 characters or less" }
            })}
          />
          {errors.risk_and_challenges && <span className="text-danger">{errors.risk_and_challenges.message}</span>}
        </Form.Group> */}

        <Form.Group className="mb-3">
          <Form.Label>Project Image</Form.Label>
          <Form.Check
            type="radio"
            label="Upload Image"
            name="imageType"
            value="file"
            {...register("imageType")}
            defaultChecked
          />
          <Form.Check
            type="radio"
            label="Image URL"
            name="imageType"
            value="url"
            {...register("imageType")}
          />
          
          {/* Conditionally Render File Input or URL Input */}
          {watchImageType === 'file' && (
            <Form.Group>
              <Form.Label>Upload Image</Form.Label>
              <Controller
                name="image"
                control={control}
                rules={{ required: !isDraft && watchImageType === 'file' ? "Project image is required" : false }}
                render={({ field }) => (
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      handleImageChange(e);
                      field.onChange(e.target.files);
                    }}
                  />
                )}
              />
              {errors.image && <span className="text-danger">{errors.image.message}</span>}
            </Form.Group>
          )}

          {watchImageType === 'url' && (
            <Form.Group>
              <Form.Label>Image URL</Form.Label>
              <Form.Control
                type="text"
                {...register("imageUrl", { required: !isDraft && watchImageType === 'url' ? "Image URL is required" : false })}
              />
              {errors.imageUrl && <span className="text-danger">{errors.imageUrl.message}</span>}
            </Form.Group>
          )}
          
          {imagePreview && watchImageType === 'file' && (
            <Image src={imagePreview} alt="Project preview" thumbnail className="mt-2" style={{ maxWidth: '200px' }} />
          )}
        </Form.Group>


        <Form.Group className="mb-3">
          <Form.Label>Project Video</Form.Label>
          <Form.Check
            type="radio"
            label="Upload Video"
            name="videoType"
            value="file"
            {...register("videoType")}
            defaultChecked
          />
          <Form.Check
            type="radio"
            label="Video URL"
            name="videoType"
            value="url"
            {...register("videoType")}
          />
          {watchVideoType === 'file' && (
            <Form.Control 
              type="file" 
              accept="video/*"
              {...register("video", { 
                required: !isDraft && watchVideoType === 'file' ? "Project video is required" : false 
              })}
              onChange={handleVideoChange}
            />
          )}
          {watchVideoType === 'url' && (
            <Form.Control 
              type="url" 
              placeholder="Enter video URL (YouTube, Vimeo, etc.)"
              {...register("videoUrl", { 
                required: !isDraft && watchVideoType === 'url' ? "Video URL is required" : false 
              })}
            />
          )}
          {videoPreview && watchVideoType === 'file' && (
            <video src={videoPreview} controls width="200" className="mt-2" />
          )}

          {errors.video && <span className="text-danger">{errors.video.message}</span>}
          {errors.videoUrl && <span className="text-danger">{errors.videoUrl.message}</span>}
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Check 
            type="checkbox"
            label="Feature this project (admin will review)"
            {...register("featured")}
          />
          <Form.Text className="text-muted">
            If selected, this project will be highlighted for users. 
          </Form.Text>
        </Form.Group>

        <Button variant="secondary" className="me-2" onClick={() => {
          setIsDraft(true);
          handleSubmit((data) => onSubmit(data, true))();
        }}>
          Save as Draft
        </Button>
        <Button variant="primary" onClick={() => setShowPreview(true)}>
          Preview
        </Button>

        <Button variant="success" type="submit" className="ms-2" disabled={isLoading} onClick={() => {
          setIsDraft(false);
          handleSubmit((data) => onSubmit(data, false))();
        }}>
          {isLoading ? 'Submitting...' : 'Submit Project'}
        </Button>
      </Form>

      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Project Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ProjectPreview />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSubmit((data) => {
            setShowPreview(false);
            onSubmit(data, false);
          })}>
            Submit Project
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showGuidelines} onHide={() => setShowGuidelines(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Project Guidelines</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ProjectGuidelines />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGuidelines(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default CreateProjectForm;