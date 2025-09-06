import { GoogleGenAI } from "@google/genai";

declare const JSZip: any;

const App = () => {
  // Common elements
  const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
  const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
  const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
  const suggestPromptBtn = document.getElementById('suggest-prompt-btn') as HTMLButtonElement;
  const resultContainer = document.getElementById('result-container');
  const resultContent = document.getElementById('result-content');
  const mediaContainer = document.getElementById('media-container');
  const downloadAllBtn = document.getElementById('download-all-btn') as HTMLButtonElement;
  const errorMessage = document.getElementById('error-message');
  const loadingContainer = document.getElementById('loading-container');
  const loadingSpinner = document.getElementById('loading-spinner');
  const loadingMessage = document.getElementById('loading-message');

  // Mode switching
  const modeIconBtn = document.getElementById('mode-icon') as HTMLButtonElement;
  const modeVideoBtn = document.getElementById('mode-video') as HTMLButtonElement;
  const modeAudioBtn = document.getElementById('mode-audio') as HTMLButtonElement;
  const iconOptionsContainer = document.getElementById('icon-options-container');
  const videoOptionsContainer = document.getElementById('video-options-container');
  const audioOptionsContainer = document.getElementById('audio-options-container');
  
  // Icon specific elements
  const negativePromptInput = document.getElementById('negative-prompt-input') as HTMLTextAreaElement;
  const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
  const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;
  const aspectRatioSelect = document.getElementById('aspect-ratio-select') as HTMLSelectElement;
  const backgroundColorPicker = document.getElementById('background-color-picker') as HTMLInputElement;
  const transparencyToggle = document.getElementById('transparency-toggle') as HTMLInputElement;
  const promptHistoryDatalist = document.getElementById('prompt-history') as HTMLDataListElement;

  // Video specific elements
  const ffmpegToggle = document.getElementById('ffmpeg-toggle') as HTMLInputElement;
  const ffmpegCommandsInput = document.getElementById('ffmpeg-commands-input') as HTMLTextAreaElement;
  
  // Preset elements
  const presetsSelect = document.getElementById('presets-select') as HTMLSelectElement;
  const presetNameInput = document.getElementById('preset-name-input') as HTMLInputElement;
  const savePresetBtn = document.getElementById('save-preset-btn') as HTMLButtonElement;
  const deletePresetBtn = document.getElementById('delete-preset-btn') as HTMLButtonElement;
  
  type AppMode = 'icon' | 'video' | 'audio';
  type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  type ImageFormat = 'image/jpeg' | 'image/png';
  const PRESETS_STORAGE_KEY = 'ai_icon_generator_presets';
  const SESSION_STORAGE_KEY = 'ai_media_generator_last_session';
  const PROMPT_HISTORY_STORAGE_KEY = 'ai_icon_generator_prompt_history';
  const MAX_PROMPT_HISTORY_SIZE = 50;
  const DEFAULT_BACKGROUND_COLOR = '#f1f3ed';

  const PROMPT_SUGGESTIONS = {
    icon: [
        "A stylized phoenix rising from digital ashes, logo for a data recovery app.",
        "A minimalist icon of an origami hummingbird in flight, representing speed and precision.",
        "A friendly robot mascot holding a magnifying glass, for a search or analytics app.",
        "A shield icon made of interlocking puzzle pieces, symbolizing collaborative security.",
        "A sapling growing out of an open book, representing a learning or education app.",
    ],
    video: [
        "A time-lapse of a city skyline from day to night, with clouds moving and lights turning on.",
        "An aerial drone shot flying over a lush, green mountain range covered in mist.",
        "A close-up, slow-motion shot of a honey bee landing on a vibrant flower.",
        "A futuristic car driving down a neon-lit city street at night.",
        "A cat playfully chasing a red laser dot across a wooden floor.",
    ],
    audio: [
        "A calm, reassuring voice reading a short meditation script.",
        "An energetic and upbeat voice for a podcast intro.",
        "A clear, professional voice for a corporate training video."
    ]
  };

  interface AppState {
    prompt: string;
    negativePrompt: string;
    imageUrls: string[];
    format: ImageFormat;
    aspectRatio: AspectRatio;
    iconStyle: string;
    quality: string;
    backgroundColor: string;
    transparentBackground: boolean;
    numberOfIcons: number;
    generationId: number;
  }
  
  interface Preset {
      name: string;
      prompt: string;
      negativePrompt: string;
      format: ImageFormat;
      aspectRatio: AspectRatio;
      iconStyle: string;
      quality: string;
      backgroundColor: string;
      transparentBackground: boolean;
      numberOfIcons: number;
  }

  interface SessionState {
    prompt: string;
    negativePrompt?: string;
    format?: ImageFormat;
    aspectRatio?: AspectRatio;
    iconStyle?: string;
    quality?: string;
    backgroundColor?: string;
    transparentBackground?: boolean;
    numberOfIcons?: number;
    currentMode: AppMode;
    videoQuality?: string;
    videoStyle?: string;
    videoAudioTrack?: string;
    videoAspectRatio?: string;
    videoResolution?: string;
    videoDuration?: string;
    videoFfmpegEnabled?: boolean;
    videoFfmpegCommands?: string;
    audioVoice?: string;
    audioAccent?: string;
    audioTone?: string;
  }

  let currentMode: AppMode = 'icon';
  let currentState: AppState | null = null;
  let undoStack: AppState[] = [];
  let redoStack: AppState[] = [];

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const getSelectedFormat = (): ImageFormat => {
    const selectedRadio = document.querySelector('input[name="format"]:checked') as HTMLInputElement;
    return (selectedRadio?.value as ImageFormat) || 'image/jpeg';
  }

  const getSelectedStyle = (): string => {
    const selectedRadio = document.querySelector('input[name="icon-style"]:checked') as HTMLInputElement;
    return selectedRadio?.value || '';
  }

  const getSelectedQuality = (): string => {
    const selectedRadio = document.querySelector('input[name="quality"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'standard';
  }
  
  const getSelectedVideoQuality = (): string => {
    const selectedRadio = document.querySelector('input[name="video-quality"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'standard';
  }

  const getSelectedVideoStyle = (): string => {
    const selectedRadio = document.querySelector('input[name="video-style"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'cinematic';
  }

  const getSelectedAudioTrack = (): string => {
    const selectedRadio = document.querySelector('input[name="video-audio-track"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'none';
  }

  const getSelectedVideoAspectRatio = (): string => {
    const selectedRadio = document.querySelector('input[name="video-aspect-ratio"]:checked') as HTMLInputElement;
    return selectedRadio?.value || '16:9';
  }
  
  const getSelectedVideoResolution = (): string => {
    const selectedRadio = document.querySelector('input[name="video-resolution"]:checked') as HTMLInputElement;
    return selectedRadio?.value || '720p';
  }

  const getSelectedVideoDuration = (): string => {
    const selectedRadio = document.querySelector('input[name="video-duration"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'medium';
  }

  const getSelectedAudioVoice = (): string => {
    const selectedRadio = document.querySelector('input[name="audio-voice"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'male';
  }

  const getSelectedAudioAccent = (): string => {
    const selectedRadio = document.querySelector('input[name="audio-accent"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'american';
  }
  
  const getSelectedAudioTone = (): string => {
    const selectedRadio = document.querySelector('input[name="audio-tone"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'professional';
  }

  const getSelectedNumberOfIcons = (): number => {
    const selectedRadio = document.querySelector('input[name="number-of-icons"]:checked') as HTMLInputElement;
    return selectedRadio ? parseInt(selectedRadio.value, 10) : 1;
  };

  const handleGeneration = () => {
    if (currentMode === 'icon') {
        generateImage();
    } else if (currentMode === 'video') {
        generateVideo();
    } else {
        generateAudio();
    }
  };

  // Helper to write string to DataView
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Function to create a placeholder WAV file blob for simulation
  const createPlaceholderWavBlob = (): Blob => {
      const RIFF = "RIFF", WAVE = "WAVE", fmt_ = "fmt ", data = "data";
      const sampleRate = 44100, numChannels = 1, bitsPerSample = 16, durationSeconds = 1;
      
      const subchunk1Size = 16; // PCM
      const blockAlign = numChannels * bitsPerSample / 8;
      const byteRate = sampleRate * blockAlign;
      const subchunk2Size = durationSeconds * sampleRate * blockAlign;
      const chunkSize = 36 + subchunk2Size;

      const buffer = new ArrayBuffer(44 + subchunk2Size);
      const view = new DataView(buffer);

      writeString(view, 0, RIFF);
      view.setUint32(4, chunkSize, true);
      writeString(view, 8, WAVE);
      writeString(view, 12, fmt_);
      view.setUint32(16, subchunk1Size, true);
      view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitsPerSample, true);
      writeString(view, 36, data);
      view.setUint32(40, subchunk2Size, true);

      return new Blob([view], { type: 'audio/wav' });
  };
  
  const generateAudio = async () => {
      const prompt = promptInput.value;
      if (!prompt) {
          showError("Please enter some text to generate audio.");
          return;
      }
      
      const voice = getSelectedAudioVoice();
      const accent = getSelectedAudioAccent();
      const tone = getSelectedAudioTone();

      setLoading(true, "Generating audio...");
      try {
          // Simulate a short delay for the API call
          await new Promise(resolve => setTimeout(resolve, 1500));

          // In a real app, you would call your TTS API here, passing the prompt, voice, accent, and tone.
          // For example: const audioBlob = await myTtsApi.generate({ text: prompt, voice: voice, accent: accent, tone: tone });
          const audioBlob = createPlaceholderWavBlob();
          const audioUrl = URL.createObjectURL(audioBlob);
          
          displayAudioResult(audioUrl, prompt, audioBlob);

      } catch (error) {
          console.error(error);
          showError("Failed to generate audio. Please try again.");
      } finally {
          setLoading(false);
      }
  };

  const generateVideo = async () => {
    let prompt = promptInput.value;
    if (!prompt) {
        showError("Please enter a prompt for the video.");
        return;
    }

    const quality = getSelectedVideoQuality();
    const style = getSelectedVideoStyle();
    const audioTrack = getSelectedAudioTrack();
    const aspectRatio = getSelectedVideoAspectRatio();
    const resolution = getSelectedVideoResolution();
    const duration = getSelectedVideoDuration();
    const ffmpegEnabled = ffmpegToggle.checked;
    const ffmpegCommands = ffmpegCommandsInput.value;
    
    let audioPromptModifier = '';
    switch (audioTrack) {
        case 'cinematic-music':
            audioPromptModifier = ', epic cinematic score, orchestral background music';
            break;
        case 'upbeat-music':
            audioPromptModifier = ', upbeat and energetic electronic background music';
            break;
        case 'ambient-sound':
            audioPromptModifier = ', realistic ambient sounds, immersive environmental audio';
            break;
        case 'sfx':
            audioPromptModifier = ', with sound effects matching the action';
            break;
        case 'none':
        default:
            audioPromptModifier = '';
            break;
    }

    let durationModifier = '';
    switch (duration) {
      case 'short':
        durationModifier = ', a short 5-second video clip';
        break;
      case 'medium':
        durationModifier = ', a 10-second video clip';
        break;
      case 'long':
        durationModifier = ', a 15-second long video';
        break;
    }

    let ffmpegModifier = '';
    if (ffmpegEnabled && ffmpegCommands.trim()) {
        ffmpegModifier = `, apply these post-processing instructions: ${ffmpegCommands.trim()}`;
    }

    const qualityPromptModifier = quality === 'high' ? ', cinematic, best quality' : '';
    const stylePromptModifier = `, ${style} style`;
    const aspectRatioModifier = `, ${aspectRatio} aspect ratio`;
    const resolutionModifier = resolution === '1080p' ? ', 1080p, full hd, 4k' : ', 720p, hd';
    const finalPrompt = prompt + stylePromptModifier + qualityPromptModifier + audioPromptModifier + aspectRatioModifier + resolutionModifier + durationModifier + ffmpegModifier;

    setLoading(true, "Starting video generation...");
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: finalPrompt,
            config: {
                numberOfVideos: 1
            }
        });
        
        const videoLoadingMessages = [
            "Warming up the digital cameras...",
            "Rendering pixels into motion...",
            "This can take a few minutes, please wait...",
            "Composing the final cut...",
            "Almost there, adding the finishing touches..."
        ];
        let messageIndex = 0;

        while (!operation.done) {
            setLoading(true, videoLoadingMessages[messageIndex % videoLoadingMessages.length]);
            messageIndex++;
            await new Promise(resolve => setTimeout(resolve, 30000)); // Increased polling time
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
            setLoading(true, "Downloading video file...");
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) {
                throw new Error(`Failed to download video: ${response.statusText}`);
            }
            const videoBlob = await response.blob();
            const videoUrl = URL.createObjectURL(videoBlob);
            displayVideoResult(videoUrl, prompt, videoBlob);
        } else {
            throw new Error("Video generation completed, but no download link was provided.");
        }

    } catch (error) {
        console.error(error);
        showError("Failed to generate video. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const generateImage = async () => {
    const prompt = promptInput.value;
    const negativePrompt = negativePromptInput.value;

    if (!prompt) {
      showError("Please enter a prompt for the icon.");
      return;
    }

    if (currentState) {
      undoStack.push(currentState);
    }

    setLoading(true);
    const isTransparent = transparencyToggle.checked;
    let outputMimeType = getSelectedFormat();
    const aspectRatio = aspectRatioSelect.value as AspectRatio;
    const iconStyle = getSelectedStyle();
    const quality = getSelectedQuality();
    const backgroundColor = backgroundColorPicker.value;
    const numberOfIcons = getSelectedNumberOfIcons();
    
    let backgroundPrompt = '';
    if (isTransparent) {
      outputMimeType = 'image/png'; // Force PNG for transparency
      backgroundPrompt = ', transparent background';
    } else if (backgroundColor.toLowerCase() !== DEFAULT_BACKGROUND_COLOR) {
      backgroundPrompt = `, solid ${backgroundColor} background`;
    }

    const qualityPromptModifier = quality === 'high' ? ', high detail, intricate, best quality, 4k' : '';
    
    // The negative prompt is appended to the main prompt string to guide the model,
    // as a separate 'negativePrompt' parameter is not supported by the API.
    let finalPrompt = [prompt, iconStyle, qualityPromptModifier].filter(Boolean).join(', ') + backgroundPrompt;
    if (negativePrompt) {
        finalPrompt += `. Do not include the following: ${negativePrompt}`;
    }

    try {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: finalPrompt,
        config: {
          numberOfImages: numberOfIcons,
          outputMimeType: outputMimeType,
          aspectRatio: aspectRatio,
        },
      });

      const imageUrls: string[] = response.generatedImages.map(img => `data:${outputMimeType};base64,${img.image.imageBytes}`);
      const generationId = Date.now();

      currentState = {
        prompt,
        negativePrompt,
        imageUrls,
        format: outputMimeType,
        aspectRatio,
        iconStyle: iconStyle,
        quality: quality,
        backgroundColor: backgroundColor,
        transparentBackground: isTransparent,
        numberOfIcons: numberOfIcons,
        generationId,
      };

      displayState(currentState);
      addToPromptHistory(prompt);
      populatePromptHistoryDatalist();
      redoStack = [];

    } catch (error) {
      console.error(error);
      let userMessage = "Failed to generate the image. Please try again.";

      if (error instanceof Error && error.message) {
        const lowerCaseMessage = error.message.toLowerCase();
        if (lowerCaseMessage.includes('api key not valid')) {
            userMessage = "The API key is invalid. Please check the application configuration.";
        } else if (lowerCaseMessage.includes('prompt was blocked')) {
            userMessage = "Your prompt was blocked for safety reasons. Please modify your prompt and try again.";
        } else if (lowerCaseMessage.includes('quota') || lowerCaseMessage.includes('resource_exhausted')) {
            userMessage = "The API quota has been exceeded. Please try again later.";
        }
      }
      
      showError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const setLoading = (isLoading: boolean, message: string | null = null) => {
    if (isLoading) {
      generateBtn.disabled = true;
      clearBtn.disabled = true;
      undoBtn.disabled = true;
      redoBtn.disabled = true;
      if (downloadAllBtn) downloadAllBtn.disabled = true;
      loadingContainer?.classList.remove('hidden');
      loadingMessage!.textContent = message || '';
      loadingMessage?.classList.toggle('hidden', !message);
      resultContent?.classList.add('hidden');
      errorMessage?.classList.add('hidden');
    } else {
      clearBtn.disabled = false;
      if (downloadAllBtn) downloadAllBtn.disabled = false;
      updateButtonStates();
      loadingContainer?.classList.add('hidden');

      // Cooldown for generate button to prevent rate-limiting.
      setTimeout(() => {
          // Re-enable only if not loading again.
          const stillLoading = !loadingContainer?.classList.contains('hidden');
          if (!stillLoading) {
              generateBtn.disabled = false;
          }
      }, 8000); // 8-second cooldown
    }
  };

  const displayAudioResult = (audioUrl: string, prompt: string, audioBlob: Blob) => {
    if (!mediaContainer || !resultContent) return;
    mediaContainer.innerHTML = '';
    mediaContainer.setAttribute('data-layout', 'single');
    if (downloadAllBtn) downloadAllBtn.classList.add('hidden');

    const itemWrapper = document.createElement('div');
    itemWrapper.className = 'audio-result-item';

    const audio = document.createElement('audio');
    audio.src = audioUrl;
    audio.controls = true;

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn-audio';
    downloadBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        <span>Download Audio</span>
    `;
    downloadBtn.addEventListener('click', () => {
      const sanitizedPrompt = prompt.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 50) || 'ai-audio';
      const timestamp = Date.now();
      const filename = `${sanitizedPrompt}-${timestamp}.wav`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(audioBlob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    });

    itemWrapper.appendChild(audio);
    itemWrapper.appendChild(downloadBtn);
    mediaContainer.appendChild(itemWrapper);

    resultContent.classList.remove('hidden');
  };

  const displayVideoResult = (videoUrl: string, prompt: string, videoBlob: Blob) => {
    if (!mediaContainer || !resultContent) return;
    mediaContainer.innerHTML = '';
    mediaContainer.setAttribute('data-layout', 'single');
    if (downloadAllBtn) downloadAllBtn.classList.add('hidden');

    const itemWrapper = document.createElement('div');
    itemWrapper.className = 'video-result-item';

    const video = document.createElement('video');
    video.src = videoUrl;
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.setAttribute('playsinline', '');

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn-video';
    downloadBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        <span>Download Video</span>
    `;
    downloadBtn.addEventListener('click', () => {
      const sanitizedPrompt = prompt.trim().toLowerCase().replace(/[^a-z0-0-]/g, '-').substring(0, 50) || 'ai-video';
      const timestamp = Date.now();
      const filename = `${sanitizedPrompt}-${timestamp}.mp4`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(videoBlob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    });

    itemWrapper.appendChild(video);
    itemWrapper.appendChild(downloadBtn);
    mediaContainer.appendChild(itemWrapper);

    resultContent.classList.remove('hidden');
  };

  const displayState = (state: AppState) => {
    if (!mediaContainer || !resultContent) return;
    
    currentState = state;

    // Update UI controls to match the state
    promptInput.value = state.prompt;
    negativePromptInput.value = state.negativePrompt;
    aspectRatioSelect.value = state.aspectRatio;
    backgroundColorPicker.value = state.backgroundColor;
    transparencyToggle.checked = state.transparentBackground;
    
    if (state.format === 'image/jpeg') {
        (document.getElementById('format-jpeg') as HTMLInputElement).checked = true;
    } else {
        (document.getElementById('format-png') as HTMLInputElement).checked = true;
    }

    const styleRadio = document.querySelector(`input[name="icon-style"][value="${state.iconStyle}"]`) as HTMLInputElement;
    if (styleRadio) styleRadio.checked = true;

    const qualityRadio = document.querySelector(`input[name="quality"][value="${state.quality}"]`) as HTMLInputElement;
    if (qualityRadio) qualityRadio.checked = true;
    
    const numberOfIconsRadio = document.querySelector(`input[name="number-of-icons"][value="${state.numberOfIcons}"]`) as HTMLInputElement;
    if (numberOfIconsRadio) numberOfIconsRadio.checked = true;
    
    updateTransparencyControls();

    // Update image grid
    mediaContainer.innerHTML = '';
    mediaContainer.setAttribute('data-layout', 'grid');
    state.imageUrls.forEach((imageUrl, index) => {
        const itemWrapper = document.createElement('div');
        itemWrapper.className = 'icon-grid-item';

        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = `${state.prompt} - variation ${index + 1}`;
        const [w, h] = state.aspectRatio.split(':').map(Number);
        img.style.aspectRatio = `${w} / ${h}`;

        const newDownloadBtn = document.createElement('button');
        newDownloadBtn.className = 'download-btn-grid';
        newDownloadBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            <span>Download</span>
        `;
        newDownloadBtn.addEventListener('click', () => downloadImage(imageUrl, index + 1));

        itemWrapper.appendChild(img);
        itemWrapper.appendChild(newDownloadBtn);
        mediaContainer.appendChild(itemWrapper);
    });

    if (downloadAllBtn) {
        downloadAllBtn.classList.toggle('hidden', state.imageUrls.length <= 1);
    }
    resultContent.classList.remove('hidden');
  };

  const showError = (message: string) => {
    if (!errorMessage) return;
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    resultContent?.classList.add('hidden');
  };

  const downloadImage = (imageUrl: string, index: number) => {
    if (!currentState) return;

    const link = document.createElement('a');
    link.href = imageUrl;
    
    const extension = currentState.format.split('/')[1];
    const sanitizedPrompt = currentState.prompt.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 50) || 'ai-icon';
    const style = currentState.iconStyle.replace(/\s/g, '-');
    const aspectRatio = currentState.aspectRatio.replace(':', 'x');
    const timestamp = currentState.generationId;
    const finalIndex = currentState.imageUrls.length > 1 ? `-${index}` : '';

    const filenameParts = [sanitizedPrompt, style, aspectRatio, timestamp];
    
    link.download = `${filenameParts.join('-')}${finalIndex}.${extension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllAsZip = async () => {
    if (!currentState || currentState.imageUrls.length <= 1) return;

    setLoading(true, "Creating zip file...");
    try {
        const zip = new JSZip();

        currentState.imageUrls.forEach((imageUrl, index) => {
            const extension = currentState.format.split('/')[1];
            const sanitizedPrompt = currentState.prompt.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 50) || 'ai-icon';
            const style = currentState.iconStyle.replace(/\s/g, '-');
            const aspectRatio = currentState.aspectRatio.replace(':', 'x');
            const timestamp = currentState.generationId;
            const finalIndex = `-${index + 1}`;
            const filenameParts = [sanitizedPrompt, style, aspectRatio, timestamp];
            const filename = `${filenameParts.join('-')}${finalIndex}.${extension}`;
            
            const base64Data = imageUrl.split(',')[1];
            zip.file(filename, base64Data, { base64: true });
        });

        const zipBlob = await zip.generateAsync({ type: "blob" });
        
        const sanitizedPrompt = currentState.prompt.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 50) || 'ai-icon-pack';
        const timestamp = currentState.generationId;
        const zipFilename = `${sanitizedPrompt}-${timestamp}.zip`;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = zipFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error("Failed to create zip file", error);
        showError("Could not create the zip file. Please try downloading icons individually.");
    } finally {
        setLoading(false);
    }
  };

  const clearUI = () => {
    promptInput.value = '';
    if (mediaContainer) mediaContainer.innerHTML = '';
    resultContent?.classList.add('hidden');
    errorMessage?.classList.add('hidden');
    if (downloadAllBtn) downloadAllBtn.classList.add('hidden');
    
    if (currentMode === 'icon') {
      negativePromptInput.value = '';
      currentState = null;
      undoStack = [];
      redoStack = [];
      
      // Reset options to default
      (document.getElementById('number-1') as HTMLInputElement).checked = true;
      (document.getElementById('format-jpeg') as HTMLInputElement).checked = true;
      (document.getElementById('style-flat') as HTMLInputElement).checked = true;
      (document.getElementById('quality-standard') as HTMLInputElement).checked = true;
      aspectRatioSelect.value = '1:1';
      backgroundColorPicker.value = DEFAULT_BACKGROUND_COLOR;
      transparencyToggle.checked = false;
      updateTransparencyControls();
      presetsSelect.value = '';
    } else if (currentMode === 'video') {
      (document.getElementById('video-quality-standard') as HTMLInputElement).checked = true;
      (document.getElementById('video-style-cinematic') as HTMLInputElement).checked = true;
      (document.getElementById('audio-track-none') as HTMLInputElement).checked = true;
      (document.getElementById('video-aspect-16x9') as HTMLInputElement).checked = true;
      (document.getElementById('video-resolution-720p') as HTMLInputElement).checked = true;
      (document.getElementById('video-duration-medium') as HTMLInputElement).checked = true;
      ffmpegToggle.checked = false;
      ffmpegCommandsInput.value = '';
      ffmpegCommandsInput.disabled = true;
    } else if (currentMode === 'audio') {
        (document.getElementById('voice-male') as HTMLInputElement).checked = true;
        (document.getElementById('accent-american') as HTMLInputElement).checked = true;
        (document.getElementById('tone-professional') as HTMLInputElement).checked = true;
    }
    
    updateButtonStates();
    localStorage.removeItem(SESSION_STORAGE_KEY);
    promptInput.focus();
  };

  const updateButtonStates = () => {
    const isVideoMode = currentMode === 'video';
    const isAudioMode = currentMode === 'audio';
    undoBtn.disabled = isVideoMode || isAudioMode || undoStack.length === 0;
    redoBtn.disabled = isVideoMode || isAudioMode || redoStack.length === 0;
    deletePresetBtn.disabled = isVideoMode || isAudioMode || !presetsSelect.value;
    savePresetBtn.disabled = isVideoMode || isAudioMode;
    presetsSelect.disabled = isVideoMode || isAudioMode;
    presetNameInput.disabled = isVideoMode || isAudioMode;
  }

  const undo = () => {
    if (currentMode !== 'icon' || undoStack.length === 0) return;

    if (currentState) {
      redoStack.push(currentState);
    }
    const previousState = undoStack.pop()!;
    displayState(previousState);
    updateButtonStates();
  };

  const redo = () => {
    if (currentMode !== 'icon' || redoStack.length === 0) return;
    
    if (currentState) {
      undoStack.push(currentState);
    }
    const nextState = redoStack.pop()!;
    displayState(nextState);
    updateButtonStates();
  };

  const suggestPrompt = () => {
    const suggestions = PROMPT_SUGGESTIONS[currentMode] || PROMPT_SUGGESTIONS.icon;
    const randomIndex = Math.floor(Math.random() * suggestions.length);
    promptInput.value = suggestions[randomIndex];
    saveSessionState();
  };

  const updateTransparencyControls = () => {
    const isTransparent = transparencyToggle.checked;
    const formatJpegRadio = document.getElementById('format-jpeg') as HTMLInputElement;
    const formatPngRadio = document.getElementById('format-png') as HTMLInputElement;

    backgroundColorPicker.disabled = isTransparent;
    formatJpegRadio.disabled = isTransparent;
    
    if (isTransparent) {
      formatPngRadio.checked = true;
    }
  };

  const switchMode = (newMode: AppMode) => {
    currentMode = newMode;
    
    modeIconBtn.classList.toggle('active', newMode === 'icon');
    modeIconBtn.setAttribute('aria-pressed', (newMode === 'icon').toString());
    modeVideoBtn.classList.toggle('active', newMode === 'video');
    modeVideoBtn.setAttribute('aria-pressed', (newMode === 'video').toString());
    modeAudioBtn.classList.toggle('active', newMode === 'audio');
    modeAudioBtn.setAttribute('aria-pressed', (newMode === 'audio').toString());

    iconOptionsContainer?.classList.toggle('hidden', newMode !== 'icon');
    videoOptionsContainer?.classList.toggle('hidden', newMode !== 'video');
    audioOptionsContainer?.classList.toggle('hidden', newMode !== 'audio');
    
    const generateBtnText = generateBtn.querySelector('span');
    if(generateBtnText) {
        if (newMode === 'icon') generateBtnText.textContent = 'Generate Icon';
        else if (newMode === 'video') generateBtnText.textContent = 'Generate Video';
        else if (newMode === 'audio') generateBtnText.textContent = 'Generate Audio';
    }
    
    // Clear results when switching modes
    if (mediaContainer) mediaContainer.innerHTML = '';
    resultContent?.classList.add('hidden');
    errorMessage?.classList.add('hidden');

    updateButtonStates();
    saveSessionState();
  };

  // --- Prompt History Functions ---

  const getPromptHistory = (): string[] => {
    const historyJSON = localStorage.getItem(PROMPT_HISTORY_STORAGE_KEY);
    return historyJSON ? JSON.parse(historyJSON) : [];
  };

  const savePromptHistory = (history: string[]) => {
    localStorage.setItem(PROMPT_HISTORY_STORAGE_KEY, JSON.stringify(history));
  };
  
  const populatePromptHistoryDatalist = () => {
      if (!promptHistoryDatalist) return;
      const history = getPromptHistory();
      promptHistoryDatalist.innerHTML = '';
      history.forEach(prompt => {
          const option = document.createElement('option');
          option.value = prompt;
          promptHistoryDatalist.appendChild(option);
      });
  };

  const addToPromptHistory = (prompt: string) => {
    if (!prompt) return;
    let history = getPromptHistory();
    history = history.filter(p => p.trim().toLowerCase() !== prompt.trim().toLowerCase());
    history.unshift(prompt);
    if (history.length > MAX_PROMPT_HISTORY_SIZE) {
        history = history.slice(0, MAX_PROMPT_HISTORY_SIZE);
    }
    savePromptHistory(history);
  };

  // --- Keyboard Shortcuts ---
  const handleKeyDown = (event: KeyboardEvent) => {
    const activeElement = document.activeElement;
    if (activeElement?.tagName === 'INPUT' && activeElement?.id !== 'prompt-input' && activeElement?.id !== 'negative-prompt-input') {
      return;
    }
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;

    const isMacRedo = isMac && event.metaKey && event.shiftKey && event.key.toLowerCase() === 'z';
    const isWindowsRedo = !isMac && event.ctrlKey && event.key.toLowerCase() === 'y';
    
    if (isCtrlOrCmd && event.key === 'Enter') {
        event.preventDefault();
        if (!generateBtn.disabled) generateBtn.click();
    } else if (isCtrlOrCmd && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (!undoBtn.disabled) undoBtn.click();
    } else if (isMacRedo || isWindowsRedo) {
        event.preventDefault();
        if (!redoBtn.disabled) redoBtn.click();
    } else if (event.key === 'Escape') {
      if (activeElement?.tagName !== 'SELECT') {
        event.preventDefault();
        if (!clearBtn.disabled) clearBtn.click();
      }
    }
  };
  
  // --- Session Functions ---

  const saveSessionState = () => {
    const sessionState: SessionState = {
      prompt: promptInput.value,
      currentMode: currentMode,
    };
    if (currentMode === 'icon') {
        sessionState.negativePrompt = negativePromptInput.value;
        sessionState.format = getSelectedFormat();
        sessionState.aspectRatio = aspectRatioSelect.value as AspectRatio;
        sessionState.iconStyle = getSelectedStyle();
        sessionState.quality = getSelectedQuality();
        sessionState.backgroundColor = backgroundColorPicker.value;
        sessionState.transparentBackground = transparencyToggle.checked;
        sessionState.numberOfIcons = getSelectedNumberOfIcons();
    } else if (currentMode === 'video') {
        sessionState.videoQuality = getSelectedVideoQuality();
        sessionState.videoStyle = getSelectedVideoStyle();
        sessionState.videoAudioTrack = getSelectedAudioTrack();
        sessionState.videoAspectRatio = getSelectedVideoAspectRatio();
        sessionState.videoResolution = getSelectedVideoResolution();
        sessionState.videoDuration = getSelectedVideoDuration();
        sessionState.videoFfmpegEnabled = ffmpegToggle.checked;
        sessionState.videoFfmpegCommands = ffmpegCommandsInput.value;
    } else if (currentMode === 'audio') {
        sessionState.audioVoice = getSelectedAudioVoice();
        sessionState.audioAccent = getSelectedAudioAccent();
        sessionState.audioTone = getSelectedAudioTone();
    }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionState));
  };

  const loadSessionState = () => {
    const savedStateJSON = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedStateJSON) {
      const savedState: SessionState = JSON.parse(savedStateJSON);
      promptInput.value = savedState.prompt;
      
      switchMode(savedState.currentMode || 'icon');

      if (savedState.currentMode === 'icon') {
        negativePromptInput.value = savedState.negativePrompt || '';
        aspectRatioSelect.value = savedState.aspectRatio || '1:1';
        backgroundColorPicker.value = savedState.backgroundColor || DEFAULT_BACKGROUND_COLOR;
        transparencyToggle.checked = savedState.transparentBackground || false;

        if (savedState.format === 'image/jpeg') {
          (document.getElementById('format-jpeg') as HTMLInputElement).checked = true;
        } else {
          (document.getElementById('format-png') as HTMLInputElement).checked = true;
        }

        const styleRadio = document.querySelector(`input[name="icon-style"][value="${savedState.iconStyle}"]`) as HTMLInputElement;
        if (styleRadio) styleRadio.checked = true;
        else (document.getElementById('style-flat') as HTMLInputElement).checked = true;

        const qualityRadio = document.querySelector(`input[name="quality"][value="${savedState.quality}"]`) as HTMLInputElement;
        if (qualityRadio) qualityRadio.checked = true;
        else (document.getElementById('quality-standard') as HTMLInputElement).checked = true;

        const numberOfIconsRadio = document.querySelector(`input[name="number-of-icons"][value="${savedState.numberOfIcons}"]`) as HTMLInputElement;
        if (numberOfIconsRadio) numberOfIconsRadio.checked = true;
        else (document.getElementById('number-1') as HTMLInputElement).checked = true;
      } else if (savedState.currentMode === 'video') {
        const qualityRadio = document.querySelector(`input[name="video-quality"][value="${savedState.videoQuality}"]`) as HTMLInputElement;
        if (qualityRadio) qualityRadio.checked = true;
        else (document.getElementById('video-quality-standard') as HTMLInputElement).checked = true;

        const styleRadio = document.querySelector(`input[name="video-style"][value="${savedState.videoStyle}"]`) as HTMLInputElement;
        if (styleRadio) styleRadio.checked = true;
        else (document.getElementById('video-style-cinematic') as HTMLInputElement).checked = true;

        let audioTrackValue = savedState.videoAudioTrack;
        // Map old values for backward compatibility
        if (audioTrackValue === 'music') audioTrackValue = 'cinematic-music';
        const audioTrackRadio = document.querySelector(`input[name="video-audio-track"][value="${audioTrackValue}"]`) as HTMLInputElement;
        if (audioTrackRadio) audioTrackRadio.checked = true;
        else (document.getElementById('audio-track-none') as HTMLInputElement).checked = true;

        const aspectRatioRadio = document.querySelector(`input[name="video-aspect-ratio"][value="${savedState.videoAspectRatio}"]`) as HTMLInputElement;
        if (aspectRatioRadio) aspectRatioRadio.checked = true;
        else (document.getElementById('video-aspect-16x9') as HTMLInputElement).checked = true;
        
        const resolutionRadio = document.querySelector(`input[name="video-resolution"][value="${savedState.videoResolution}"]`) as HTMLInputElement;
        if (resolutionRadio) resolutionRadio.checked = true;
        else (document.getElementById('video-resolution-720p') as HTMLInputElement).checked = true;

        const durationRadio = document.querySelector(`input[name="video-duration"][value="${savedState.videoDuration}"]`) as HTMLInputElement;
        if (durationRadio) durationRadio.checked = true;
        else (document.getElementById('video-duration-medium') as HTMLInputElement).checked = true;
        
        ffmpegToggle.checked = savedState.videoFfmpegEnabled || false;
        ffmpegCommandsInput.value = savedState.videoFfmpegCommands || '';
        ffmpegCommandsInput.disabled = !ffmpegToggle.checked;


      } else if (savedState.currentMode === 'audio') {
        const voiceRadio = document.querySelector(`input[name="audio-voice"][value="${savedState.audioVoice}"]`) as HTMLInputElement;
        if (voiceRadio) voiceRadio.checked = true;
        else (document.getElementById('voice-male') as HTMLInputElement).checked = true;

        const accentRadio = document.querySelector(`input[name="audio-accent"][value="${savedState.audioAccent}"]`) as HTMLInputElement;
        if (accentRadio) accentRadio.checked = true;
        else (document.getElementById('accent-american') as HTMLInputElement).checked = true;
        
        const toneRadio = document.querySelector(`input[name="audio-tone"][value="${savedState.audioTone}"]`) as HTMLInputElement;
        if (toneRadio) toneRadio.checked = true;
        else (document.getElementById('tone-professional') as HTMLInputElement).checked = true;
      }
    } else {
        switchMode('icon');
    }
    updateTransparencyControls();
  };


  // --- Preset Functions ---

  const getPresets = (): Preset[] => {
    const presetsJSON = localStorage.getItem(PRESETS_STORAGE_KEY);
    return presetsJSON ? JSON.parse(presetsJSON) : [];
  };

  const savePresets = (presets: Preset[]) => {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  };
  
  const populatePresetsDropdown = () => {
    const presets = getPresets();
    const currentSelection = presetsSelect.value;
    presetsSelect.innerHTML = '<option value="">Load a preset...</option>';
    presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = preset.name;
      option.textContent = preset.name;
      presetsSelect.appendChild(option);
    });
    presetsSelect.value = currentSelection;
  };

  const saveCurrentPreset = () => {
    if (currentMode !== 'icon') return;
    const name = presetNameInput.value.trim();
    if (!name) {
      alert("Please enter a name for the preset.");
      return;
    }
    
    const newPreset: Preset = {
      name,
      prompt: promptInput.value,
      negativePrompt: negativePromptInput.value,
      format: getSelectedFormat(),
      aspectRatio: aspectRatioSelect.value as AspectRatio,
      iconStyle: getSelectedStyle(),
      quality: getSelectedQuality(),
      backgroundColor: backgroundColorPicker.value,
      transparentBackground: transparencyToggle.checked,
      numberOfIcons: getSelectedNumberOfIcons(),
    };

    let presets = getPresets();
    const existingIndex = presets.findIndex(p => p.name === name);
    
    if (existingIndex > -1) {
      presets[existingIndex] = newPreset;
    } else {
      presets.push(newPreset);
    }

    savePresets(presets);
    populatePresetsDropdown();
    presetsSelect.value = name;
    presetNameInput.value = '';
    updateButtonStates();
  };

  const loadSelectedPreset = () => {
    if (currentMode !== 'icon') return;
    const presetName = presetsSelect.value;
    if (!presetName) {
        updateButtonStates();
        return;
    };

    const presets = getPresets();
    const preset = presets.find(p => p.name === presetName);

    if (preset) {
      promptInput.value = preset.prompt;
      negativePromptInput.value = preset.negativePrompt || '';
      aspectRatioSelect.value = preset.aspectRatio;
      backgroundColorPicker.value = preset.backgroundColor || DEFAULT_BACKGROUND_COLOR;
      transparencyToggle.checked = preset.transparentBackground || false;

      if (preset.format === 'image/jpeg') {
        (document.getElementById('format-jpeg') as HTMLInputElement).checked = true;
      } else {
        (document.getElementById('format-png') as HTMLInputElement).checked = true;
      }
      
      const styleRadio = document.querySelector(`input[name="icon-style"][value="${preset.iconStyle}"]`) as HTMLInputElement;
      if (styleRadio) styleRadio.checked = true;

      const qualityRadio = document.querySelector(`input[name="quality"][value="${preset.quality}"]`) as HTMLInputElement;
      if (qualityRadio) qualityRadio.checked = true;

      const numberOfIconsRadio = document.querySelector(`input[name="number-of-icons"][value="${preset.numberOfIcons}"]`) as HTMLInputElement;
      if (numberOfIconsRadio) numberOfIconsRadio.checked = true;
    }
    updateButtonStates();
    updateTransparencyControls();
  };

  const deleteSelectedPreset = () => {
    if (currentMode !== 'icon') return;
    const presetName = presetsSelect.value;
    if (!presetName) return;

    let presets = getPresets();
    presets = presets.filter(p => p.name !== presetName);
    savePresets(presets);
    populatePresetsDropdown();
    updateButtonStates();
  };

  const initialize = () => {
    populatePresetsDropdown();
    populatePromptHistoryDatalist();

    generateBtn.addEventListener('click', handleGeneration);
    clearBtn.addEventListener('click', clearUI);
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    suggestPromptBtn.addEventListener('click', suggestPrompt);
    downloadAllBtn.addEventListener('click', downloadAllAsZip);
    
    modeIconBtn.addEventListener('click', () => switchMode('icon'));
    modeVideoBtn.addEventListener('click', () => switchMode('video'));
    modeAudioBtn.addEventListener('click', () => switchMode('audio'));
    
    savePresetBtn.addEventListener('click', saveCurrentPreset);
    presetsSelect.addEventListener('change', loadSelectedPreset);
    deletePresetBtn.addEventListener('click', deleteSelectedPreset);
    
    // Session save event listeners
    promptInput.addEventListener('input', saveSessionState);
    negativePromptInput.addEventListener('input', saveSessionState);
    document.querySelectorAll('input[name="format"], input[name="icon-style"], input[name="quality"], input[name="number-of-icons"]').forEach(radio => {
        radio.addEventListener('change', saveSessionState);
    });
    document.querySelectorAll('input[name="video-quality"], input[name="video-style"], input[name="video-audio-track"], input[name="video-aspect-ratio"], input[name="video-resolution"], input[name="video-duration"]').forEach(radio => {
      radio.addEventListener('change', saveSessionState);
    });
    document.querySelectorAll('input[name="audio-voice"], input[name="audio-accent"], input[name="audio-tone"]').forEach(radio => {
      radio.addEventListener('change', saveSessionState);
    });
    aspectRatioSelect.addEventListener('change', saveSessionState);
    backgroundColorPicker.addEventListener('input', saveSessionState);
    transparencyToggle.addEventListener('change', () => {
      updateTransparencyControls();
      saveSessionState();
    });

    ffmpegToggle.addEventListener('change', () => {
      ffmpegCommandsInput.disabled = !ffmpegToggle.checked;
      saveSessionState();
    });
    ffmpegCommandsInput.addEventListener('input', saveSessionState);


    document.addEventListener('keydown', handleKeyDown);

    loadSessionState();
  };

  initialize();
};

App();